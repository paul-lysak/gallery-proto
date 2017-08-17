package com.aimplicits.gallery

import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.security.KeyFactory
import java.security.spec.PKCS8EncodedKeySpec
import java.util.{Base64, Date}

import com.amazonaws.serverless.proxy.internal.model.AwsProxyResponse
import com.amazonaws.services.cloudfront.CloudFrontCookieSigner
import com.amazonaws.services.cloudfront.CloudFrontCookieSigner.CookiesForCustomPolicy
import com.amazonaws.services.kms.AWSKMSClientBuilder
import com.amazonaws.services.kms.model.DecryptRequest
import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.Context
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._

/**
  * AWS Lambda function that generates signed cookies that grant access to CloudFront protected content
  *
  * Take a look at params field to see which params should be specified when defining Lambda in AWS console
  *
  * When proxying via API Gateway make sure to:
  * 1) Map GET and OPTIONS methods separately, not though ALL methods. The reason is:
  * 2) GET Method Request must be configured with Cognito User Pool Authorization.
  * 3) OPTIONS Method Request must not require any authentication
  * 4) Make sure that for both methods "Use Lambda Proxy integration" checkbox in Integration Request is checked - it provides valid input to the lambda
  *
  * In fact, OPTIONS method and other CORS facilities are mostly for development, when URL from which front-end is served
  * differs from CloudFront distribution's URL. In production OPTIONS method configuration may be ommited.
  *
  */
class CloudFrontAuthorizationLambda extends RequestHandler[java.util.Map[String, AnyRef], AwsProxyResponse]{
  override def handleRequest(input: java.util.Map[String, AnyRef], context: Context): AwsProxyResponse = {
    val re = new RequestExtractor(input)

    log.debug(s"Raw request: ${input.asScala}")
    log.debug(s"""Extracted from request:
        |Required role: ${params.requiredRole}
        |method = ${re.httpMethod}
        |rc = ${re.rc}
        |a = ${re.authorizer}
        |c = ${re.claims}
        |Actual groups: ${re.cognitoGroups}
        |Actual roles: ${re.cognitoRoles}
      """.stripMargin)

    re.httpMethod match {
      case "GET" => onGet(re)
      case "OPTIONS" => onOptions(re)
      case other => onUnsupportedMethod(re)
    }
  }

  private def onGet(re: RequestExtractor): AwsProxyResponse = {
    if(re.cognitoRoles.exists(params.requiredRole.contains)) {

      val c = signCookiesCustom()

      //Case mismatches are a dirty hack in order to overcome API Gateway limitations - it only allows single header of single type,
      //while in order to use signed cookies with CloudFront protected content need to have 3 set-cookie headers
      val sc = Seq("set-cookie" -> c.getPolicy,
        "Set-Cookie" -> c.getKeyPairId,
        "Set-cookie" -> c.getSignature).
        map {
          case (k, kv) =>
            val path = params.cookiePath.getOrElse("/")
            k -> s"${kv.getKey}=${kv.getValue}; HttpOnly; Path=$path"
        }

      new AwsProxyResponse(200,
        (stdHeaders ++ sc).asJava,
        """
          |{"message": "ok"}
        """.stripMargin.trim)
    } else {
      new AwsProxyResponse(403, stdHeaders.asJava,
        """
          |{"message": "User doesn't have required role"}
        """.stripMargin.trim)
    }
  }

  private def onOptions(re: RequestExtractor) : AwsProxyResponse = {
    new AwsProxyResponse(200, stdHeaders.asJava,
        """
          |{"message": "ok"}
        """.stripMargin.trim)
  }

  private def onUnsupportedMethod(re: RequestExtractor): AwsProxyResponse = {
    new AwsProxyResponse(400, stdHeaders.asJava,
        s"""
          |{"message": "Method not supported: ${re.httpMethod}"}
        """.stripMargin.trim)
  }

  private lazy val stdHeaders = Map(
          "Content-Type" -> "application/json"
        ) ++ corsHeaders

  private lazy val corsHeaders = params.allowedOrigins.fold({
    log.info("allowedOrigins parameter not specified - skipping CORS headers")
    Map.empty[String, String]})(allowedOrigins => Map(
          "Access-Control-Allow-Origin" -> allowedOrigins,
          "Access-Control-Allow-Credentials" -> "true",
          "Access-Control-Allow-Headers" -> "Authorization"
        )
  )

  private def signCookiesCustom(): CookiesForCustomPolicy = {
    val s = "-----BEGIN PRIVATE KEY-----"
    val e = "-----END PRIVATE KEY-----"
    val replacedText = params.pkText.replaceAll(s"$s|$e| |\\n", "")
    val pkBytes = Base64.getDecoder.decode(replacedText)
    val keySpec = new PKCS8EncodedKeySpec(pkBytes);
    val kf = KeyFactory.getInstance("RSA");
    val pk = kf.generatePrivate(keySpec);

    val expires = new Date(System.currentTimeMillis() + params.cookiesLifetimeMinutes*60*60*1000L)

    CloudFrontCookieSigner.getCookiesForCustomPolicy(params.resourceUrl, pk, params.keyPairId, expires, null, null)
  }

  private val log = LoggerFactory.getLogger(classOf[CloudFrontAuthorizationLambda])


  private object params {

    lazy val allowedOrigins = getStringOpt("allowedOrigins")

    lazy val cookiePath = getStringOpt("cookiePath")

    lazy val requiredRole = getString("requiredRole")

    lazy val keyPairId = getString("keyPairId")

    lazy val resourceUrl = getString("resourceUrl")

    lazy val cookiesLifetimeMinutes: Int = Option(System.getenv("cookiesLifetimeMinutes")).map(_.toInt).getOrElse(30)

    // AWS generates PKCS1 keys, make sure to convert it to PKCS8 prior to inserting into Lambda function params:
    // openssl pkcs8 -topk8 -nocrypt -in pk-<code generated by AWS>.pem -inform PEM -out pk-cloudfront-pkcs8.pem -outform PEM
    lazy val pkText: String = getEnctyptedString("cloudFrontPK")


    private def getIntOpt(key: String): Option[Int] = {
      Option(System.getenv(key)).flatMap(v => try {
        Option(v.toInt)
      } catch {
        case e: NumberFormatException =>
          log.warn(s"$key value $v is not an integer number")
          None
      })
    }

    private def getStringOpt(key: String): Option[String] = {
      Option(System.getenv(key))
    }

    private def getString(key: String): String = {
      getStringOpt(key).getOrElse(throw new RuntimeException(s"Mandatory parameter $key not specified`"))
    }

    private def getEnctyptedString(key: String): String = {
      val rawParam = getString(key)
      val encryptedKey = Base64.getDecoder.decode(rawParam);
      val client = AWSKMSClientBuilder.defaultClient();
      val request = new DecryptRequest().withCiphertextBlob(ByteBuffer.wrap(encryptedKey));
      val plainTextKey = client.decrypt(request).getPlaintext();
      new String(plainTextKey.array(), Charset.forName("UTF-8"));
    }
  }
}

class RequestExtractor(req: java.util.Map[String, AnyRef]) {
  private val r = req.asScala

  lazy val rc = r.get("requestContext").fold(Map.empty[String, AnyRef])(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala.toMap)

  lazy val body: Option[String] = r.get("body").map(_.asInstanceOf[String])

  lazy val resource: Option[String] = r.get("resource")map(_.asInstanceOf[String])

  lazy val httpMethod: String = r("httpMethod").asInstanceOf[String]

  lazy val path: String = r("path").asInstanceOf[String]

  lazy val authorizer = rc.get("authorizer").map(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala)

  lazy val claims = authorizer.flatMap(_.get("claims")).map(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala)

  private lazy val cognitoGroupsStr: Option[String] = claims.flatMap(_.get("cognito:groups")).map(_.asInstanceOf[String])
  lazy val cognitoGroups: Seq[String] = cognitoGroupsStr.fold(Seq.empty[String])(_.split(",").map(_.trim))

  private lazy val cognitoRolesStr: Option[String] = claims.flatMap(_.get("cognito:roles")).map(_.asInstanceOf[String])
  lazy val cognitoRoles: Seq[String] = cognitoRolesStr.fold(Seq.empty[String])(_.split(",").map(_.trim))
}
