package com.aimplicits.gallery

import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.Context
import org.slf4j.LoggerFactory;
import scala.collection.JavaConverters._

class SampleLambda extends RequestHandler[java.util.Map[String, AnyRef], AwsProxyResponse]{
//  class SampleLambda extends RequestHandler[AwsProxyRequest, AwsProxyResponse]{
  //TODO
//  override def handleRequest(input: AwsProxyRequest, context: Context): AwsProxyResponse = {
  override def handleRequest(input: java.util.Map[String, AnyRef], context: Context): AwsProxyResponse = {
    println("stdout: got the request: "+input.toString)
//    println("stdout: got the request: "+inputStr)
//    val token = Option(input.getQueryStringParameters()).flatMap(params => Option(params.get("token")))
//    log.debug("got the token: "+token)
//    log.info("dbg: got the request: "+input.toString)

//    val rc = input.getRequestContext
//    val rca = rc.getAuthorizer
//    val resp =
//      s"""
//        |Sample body. GI: ${context.getIdentity},
//        |claims=${rca.getClaims},
//        |subj=${rca.getClaims.getSubject}
//        |un=${rca.getClaims.getUsername}
//        |cg=${rca.getContextValue("cognito:groups")},
//        |email=${rca.getClaims.getEmail},
//        |idu=${rc.getIdentity.getUser}
//        |idua=${rc.getIdentity.getUserArn}
//        |cii=${rc.getIdentity.getCognitoIdentityId}
//        |principal=${rca.getPrincipalId}
//      """.stripMargin
//    val resp =
//      s"""
//        |params = ${input.getQueryString}
//      """.stripMargin
    val re = new RequestExtractor(input)

//    val requiredGroup = Option(System.getenv("requiredGroup"))
//    val actualGroups = re.cognitoGroups

    val requiredRole = Option(System.getenv("requiredRole"))

    val resp =
      s"""
        |Request was: ${input.asScala}
        |Required role: $requiredRole
        |rc = ${re.requestContext}
        |a = ${re.authorizer}
        |c = ${re.claims}
        |Actual groups: ${re.cognitoGroups}
        |Actual roles: ${re.cognitoRoles}
      """.stripMargin

    if(re.cognitoRoles.exists(requiredRole.contains))
      new AwsProxyResponse(200, Map("Content-Type" -> "text/plain").asJava, resp)
    else
      new AwsProxyResponse(403, Map("Content-Type" -> "text/plain").asJava, "User doesn't have required role")
  }

  private val log = LoggerFactory.getLogger(classOf[SampleLambda])
}

class RequestExtractor(req: java.util.Map[String, AnyRef]) {
  private val r = req.asScala

  lazy val requestContext = r.get("requestContext").map(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala)

  lazy val authorizer = requestContext.flatMap(_.get("authorizer")).map(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala)

  lazy val claims = authorizer.flatMap(_.get("claims")).map(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala)

  private lazy val cognitoGroupsStr: Option[String] = claims.flatMap(_.get("cognito:groups")).map(_.asInstanceOf[String])
  lazy val cognitoGroups: Seq[String] = cognitoGroupsStr.fold(Seq.empty[String])(_.split(",").map(_.trim))

  private lazy val cognitoRolesStr: Option[String] = claims.flatMap(_.get("cognito:roles")).map(_.asInstanceOf[String])
  lazy val cognitoRoles: Seq[String] = cognitoRolesStr.fold(Seq.empty[String])(_.split(",").map(_.trim))
}
