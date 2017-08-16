package com.aimplicits.gallery

import java.awt.{Color, Font, RenderingHints}
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.util.Base64
import javax.imageio.ImageIO

import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.s3.{AmazonS3Client, AmazonS3ClientBuilder}
import org.apache.commons.io.IOUtils
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._

/**
  *
  * Due to API Gateway peculiarities only works properly if request has Accept: image/jpeg header, otherwise returns base64-encoded image
  *
  * Created by Paul Lysak on 15/08/17.
  */
class ResizerLambda extends RequestHandler[AwsProxyRequest, AwsProxyResponse] {
  override def handleRequest(input: AwsProxyRequest, context: Context): AwsProxyResponse = {
    val pathParams: Map[String, String] = Option(input.getPathParameters).fold(Map.empty[String, String])(_.asScala.toMap)
    val queryParams: Map[String, String] = Option(input.getQueryStringParameters).fold(Map.empty[String, String])(_.asScala.toMap)

    log.debug(s"Path params=${pathParams}, query params=${queryParams}")


    val filePathOpt: Option[String] = pathParams.get(FILE_PATH_PARAM).orElse(queryParams.get(FILE_PATH_PARAM))
    val wOpt = queryParams.get(WIDTH_PARAM).flatMap(toIntOpt("w"))
    val hOpt = queryParams.get(HEIGHT_PARAM).flatMap(toIntOpt("h"))

    (wOpt, hOpt, filePathOpt) match {
      case (None, None, _) => validationFailed(s"Neither $WIDTH_PARAM, nor $HEIGHT_PARAM query parameter not specified")
      case (_, _, None) => validationFailed(s"$FILE_PATH_PARAM path or query parameter not specified")
      case (wO, hO, Some(filePath)) =>
        log.debug(s"Bucket: ${params.galleryBucket}, folder: ${params.galleryFolder}")
        val res = new AwsProxyResponse(200,
          Map("Content-Type" -> "image/jpeg").asJava,
          scalePicture(filePath, wO, hO)
        )
        res.setBase64Encoded(true)
        res
    }
  }

  private def scalePicture(filePath: String, maxWidth: Option[Int], maxHeight: Option[Int]): String = {
    val key = s"${params.galleryFolder}/$filePath"
    log.debug(s"Resizing $key from bucket ${params.galleryBucket} to fit into $maxWidth*$maxHeight")
    val s3Client = AmazonS3ClientBuilder.defaultClient()
    val obj = s3Client.getObject(params.galleryBucket, key)
    obj.getObjectContent
    val content = try {
      IOUtils.toByteArray(obj.getObjectContent)
    } finally {
      IOUtils.closeQuietly(obj.getObjectContent)
    }

    log.info(s"Object $key size: ${content.length}")

    samplePicture()
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

  private def toIntOpt(paramName: String)(str: String): Option[Int] = {
    try {
      Option(str.toInt)
    } catch {
      case e: NumberFormatException =>
        log.error(s"$paramName is not an integer: $str")
        None
    }
  }

  private object params {
    lazy val galleryBucket = getString("galleryBucket")
    lazy val galleryFolder = getString("galleryFolder")

    private def getStringOpt(key: String): Option[String] = {
      Option(System.getenv(key))
    }

     private def getString(key: String): String = {
      getStringOpt(key).getOrElse(throw new RuntimeException(s"Mandatory parameter $key not specified`"))
    }
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
