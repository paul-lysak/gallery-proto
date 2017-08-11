package com.aimplicits.gallery

import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.Context
import org.slf4j.LoggerFactory;
import scala.collection.JavaConverters._

class SampleLambda extends RequestHandler[AwsProxyRequest, AwsProxyResponse]{
  //TODO
  override def handleRequest(input: AwsProxyRequest, context: Context): AwsProxyResponse = {
    println("stdout: got the request: "+input.toString)
    log.debug("upd: got the request: "+input.toString)
//    log.info("dbg: got the request: "+input.toString)

//    s"""{"isBase64Encoded": false, "statusCode": 200, "headers": {"Content-Type": "text/plain"}, "body": "Sample response body"}""".stripMargin
//    s"""{"statusCode": "200", "headers": {"Content-Type": "text/plain"}, "body": "{}"}""".stripMargin
    s"""{"statusCode": "200", "headers": {"Content-Type": "text/plain"}, "body": {}}""".stripMargin
//    s"""{"statusCode": 200, "body": "Sample response body"}""".stripMargin
    new AwsProxyResponse(200, Map("Content-Type" -> "text/plain").asJava, "Sample body")
  }

  private val log = LoggerFactory.getLogger(classOf[SampleLambda])
}

