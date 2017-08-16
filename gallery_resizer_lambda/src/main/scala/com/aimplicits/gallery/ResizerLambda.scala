package com.aimplicits.gallery

import java.awt.{Color, Font, RenderingHints}
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.util.Base64
import javax.imageio.ImageIO

import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._

/**
  * Created by Paul Lysak on 15/08/17.
  */
//class ResizerLambda extends RequestHandler[java.util.Map[String, AnyRef], AwsProxyResponse] {
  class ResizerLambda extends RequestHandler[java.util.Map[String, AnyRef], String] {
//  class ResizerLambda extends RequestHandler[AwsProxyRequest, AwsProxyResponse] {
//  override def handleRequest(input: AwsProxyRequest, context: Context): AwsProxyResponse = {
//    override def handleRequest(input: java.util.Map[String, AnyRef] , context: Context): AwsProxyResponse = {
  override def handleRequest(input: java.util.Map[String, AnyRef] , context: Context): String = {

//      log.debug(s"Full request=${inputMap.asScala.toMap}, custom = ${context.getClientContext.getCustom.asScala}, env=${context.getClientContext.getEnvironment.asScala}")
//      log.debug(s"Full request=${inputMap.asScala.toMap}")

//      val input = new AwsProxyRequest()
//    val pathParams = Option(input.getPathParameters).fold(Map.empty[String, String])(_.asScala.toMap)
//    val queryParams = Option(input.getQueryStringParameters).fold(Map.empty[String, String])(_.asScala.toMap)

  val re = new RequestExtractor(input)

    log.debug(s"Path params=${re.pathParams}, query params=${re.queryParams}")

    val filePathOpt = Option(re.pathParams.get(FILE_PATH_PARAM))
      .getOrElse(re.queryParams(FILE_PATH_PARAM))
    val wOpt = Option(re.queryParams.get(WIDTH_PARAM))
    val hOpt = Option(re.queryParams.get(HEIGHT_PARAM))
    (wOpt, hOpt, filePathOpt) match {
      case (None, None, _) => validationFailed(s"Neither $WIDTH_PARAM, nor $HEIGHT_PARAM query parameter not specified").toString
      case (_, _, None) => validationFailed(s"$FILE_PATH_PARAM path or query parameter not specified").toString
      case (wO, hO, Some(filePath)) =>
//        val res = new AwsProxyResponse(200,
//          Map("Content-Type" -> "image/jpeg").asJava,
//          samplePicture()
//        )
//        res.setBase64Encoded(true)
//        res
        samplePicture()
//        new AwsProxyResponse(200,
//          Map("Content-Type" -> "application/json").asJava,
//        s"""
//          |{"message": "TODO: re-code $filePath to $wO by $hO"}
//        """.stripMargin.trim)
    }

  }

  private def samplePicture(): String = {
    val img = new BufferedImage(100, 100, BufferedImage.TYPE_3BYTE_BGR)
    val g2d = img.createGraphics();
    g2d.setRenderingHint(RenderingHints.KEY_ALPHA_INTERPOLATION, RenderingHints.VALUE_ALPHA_INTERPOLATION_QUALITY);
    g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    g2d.setRenderingHint(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_QUALITY);
    g2d.setRenderingHint(RenderingHints.KEY_DITHERING, RenderingHints.VALUE_DITHER_ENABLE);
    g2d.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
    g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
    g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
    g2d.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);

    val font = new Font("Arial", Font.PLAIN, 10);
    g2d.setFont(font);
    val fm = g2d.getFontMetrics();
    g2d.setColor(Color.green);
    g2d.drawString("Hi, there", 0, fm.getAscent());

    val baos = new ByteArrayOutputStream()
    ImageIO.write(img, "jpg", baos)
    g2d.dispose()

    Base64.getEncoder.encodeToString(baos.toByteArray)
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

class RequestExtractor(req: java.util.Map[String, AnyRef]) {
  private val r = req.asScala

  lazy val params = r.get("params").fold(Map.empty[String, AnyRef])(_.asInstanceOf[java.util.Map[String, AnyRef]].asScala.toMap)

  lazy val queryParams = params.get("querystring").fold(Map.empty[String, String])(_.asInstanceOf[java.util.Map[String, String]].asScala.toMap)

  lazy val pathParams = params.get("path").fold(Map.empty[String, String])(_.asInstanceOf[java.util.Map[String, String]].asScala.toMap)

}
