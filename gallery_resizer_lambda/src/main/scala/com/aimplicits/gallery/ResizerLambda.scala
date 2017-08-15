package com.aimplicits.gallery

import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._

/**
  * Created by Paul Lysak on 15/08/17.
  */
class ResizerLambda extends RequestHandler[AwsProxyRequest, AwsProxyResponse] {
  override def handleRequest(input: AwsProxyRequest, context: Context): AwsProxyResponse = {
    log.debug("Received request: "+input)
    val filePathOpt = Option(input.getPathParameters.get(FILE_PATH_PARAM))
    val wOpt = Option(input.getQueryStringParameters).flatMap(m => Option(m.get(WIDTH_PARAM)))
    val hOpt = Option(input.getQueryStringParameters).flatMap(m => Option(m.get(HEIGHT_PARAM)))
    (wOpt, hOpt, filePathOpt) match {
      case (None, None, _) => validationFailed(s"Neither $WIDTH_PARAM, nor $HEIGHT_PARAM query parameter not specified")
      case (_, _, None) => validationFailed(s"$FILE_PATH_PARAM path parameter not specified")
      case (wO, hO, Some(filePath)) =>
        new AwsProxyResponse(200,
          Map("Content-Type" -> "application/json").asJava,
        s"""
          |{"message": "TODO: re-code $filePath to $wO by $hO"}
        """.stripMargin.trim)
    }

  }

  private def validationFailed(msg: String): AwsProxyResponse = {
      new AwsProxyResponse(400,
        Map("Content-Type" -> "application/json").asJava,
      s"""
        |{"message": "$msg"}
      """.stripMargin.trim)
  }

  private val WIDTH_PARAM = "w"
  private val HEIGHT_PARAM = "h"
  private val FILE_PATH_PARAM = "filePath"

  private val log = LoggerFactory.getLogger(classOf[ResizerLambda])
}
