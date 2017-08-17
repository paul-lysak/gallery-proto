package com.aimplicits.gallery

import java.awt.geom.AffineTransform
import java.awt.{Color, Font, RenderingHints}
import java.awt.image.BufferedImage
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import java.util.Base64
import javax.imageio.ImageIO

import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.s3.{AmazonS3Client, AmazonS3ClientBuilder}
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.{ExifDirectoryBase, ExifIFD0Directory}
import org.apache.commons.imaging.Imaging
import org.apache.commons.imaging.formats.jpeg.JpegImageMetadata
import org.apache.commons.imaging.formats.jpeg.exif.ExifRewriter
import org.apache.commons.imaging.formats.tiff.constants.{ExifTagConstants, TiffTagConstants}
import org.apache.commons.imaging.formats.tiff.write.TiffOutputSet
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
          getScaled(filePath, wO, hO)
        )
        res.setBase64Encoded(true)
        res
    }
  }

  private def getScaled(filePath: String, maxWidth: Option[Int], maxHeight: Option[Int]): String = {
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

    val out = fitPicture(key, content, maxWidth, maxHeight)
    Base64.getEncoder.encodeToString(out)
  }

  private def calculateDstDimensions(srcW: Int, srcH: Int, maxW: Option[Int], maxH: Option[Int]): (Int, Int) = {
    (maxW, maxH) match {
      case (Some(w), None) =>
        val k = w.toDouble / srcW.toDouble
        (w, (k * srcH).toInt)
      case (None, Some(h)) =>
        val k = h.toDouble / srcH.toDouble
        ((k * srcW).toInt, h)
      case (None, None) =>
        (srcW, srcH)
      case (Some(w), Some(h)) =>
        val kw = w.toDouble / srcW.toDouble
        val kh = h.toDouble / srcH.toDouble
        if(kh > kw)
          (w, (kw * srcH).toInt)
        else
          ((kh * srcW).toInt, h)
    }
  }

  /**
    * Fit image in specified width and height limits maintaining the proportions.
    *
    * @param src
    * @param maxW
    * @param maxH
    * @return
    */
  private def fitPicture(fileName: String, src: Array[Byte], maxW: Option[Int], maxH: Option[Int]): Array[Byte] = {

    val img = ImageIO.read(new ByteArrayInputStream(src))
//    val props = img.getPropertyNames.toSeq
//    log.debug(s"Img properties: $props")

    val srcW = img.getWidth
    val srcH = img.getHeight

    val (dstW, dstH) = calculateDstDimensions(srcW, srcH, maxW, maxH)

    val o = getOrientation(fileName, src)
    log.debug(s"Original size: $srcW*$srcH, scaling to: $dstW*$dstH. Orientation: $o")
    val dstImg = new BufferedImage(dstW, dstH, img.getType)
    val g = dstImg.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
    RenderingHints.VALUE_INTERPOLATION_BILINEAR);



//    val at = new AffineTransform();
                  o match {
                    case 1 => //norm
                    case 2 => // Flip X
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.FLIP_HORZ);
                    case 3 => // PI rotation
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.CW_180);
//                       at.translate(dstW, dstH);
//            at.rotate(Math.PI);
                    case 4 => // Flip Y
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.FLIP_VERT);
                    case 5 => // - PI/2 and Flip X
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.CW_90);
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.FLIP_HORZ);
                    case 6 => // -PI/2 and -width
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.CW_90);
                    case 7 => // PI/2 and Flip
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.CW_90);
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.FLIP_VERT);
                    case 8 => // PI / 2
//                        scaledImg = Scalr.rotate(scaledImg, Rotation.CW_270);
                    case other =>
                      log.warn(s"Unknown orientation: $other")
                    }


    g.drawImage(img, 0, 0, dstW, dstH, 0, 0, img.getWidth(), img.getHeight(), null);
    g.dispose()

    val baos = new ByteArrayOutputStream()
    ImageIO.write(dstImg, "jpg", baos)
    val scaledImg = baos.toByteArray


//    val exif = Imaging.getMetadata(scaledImg).asInstanceOf[JpegImageMetadata].getExif
//    log.debug(s"Scaled exif: $exif")
//    val tos = exif.getOutputSet
    val tos = new TiffOutputSet()
    log.debug(s"Scaled TOS: $tos")
    val dir = tos.getOrCreateExifDirectory()
    dir.add(TiffTagConstants.TIFF_TAG_ORIENTATION, o.toShort)
    dir.add(TiffTagConstants.TIFF_TAG_IMAGE_DESCRIPTION, "Sample picture")

    val resStrean = new ByteArrayOutputStream()
    new ExifRewriter().updateExifMetadataLossy(scaledImg, resStrean, tos)

    resStrean.toByteArray
  }

  private def getOrientation(fileName: String, src: Array[Byte]): Int = {
//    val md = ImageMetadataReader.readMetadata(new ByteArrayInputStream(src))
//    val imDir = md.getFirstDirectoryOfType(classOf[ExifIFD0Directory])
//    val o1 = imDir.getInt(ExifDirectoryBase.TAG_ORIENTATION)
//    log.debug(s"Orientation o1=$o1")

    Imaging.getMetadata(src) match {
      case jpegMd: JpegImageMetadata =>
        val tag = jpegMd.getExif.findField(TiffTagConstants.TIFF_TAG_ORIENTATION)
        if(tag == null) {
          log.warn(s"No orientation tag in $fileName - falling back to default orientation")
          TiffTagConstants.ORIENTATION_VALUE_HORIZONTAL_NORMAL
        } else {
          val o = tag.getIntValue
          log.debug(s"Retrieved orientation from $fileName: $o")
          o
        }
      case _ =>
        log.warn(s"Couldn't retrieve picture orientation from $fileName - falling back to default orientation")
        TiffTagConstants.ORIENTATION_VALUE_HORIZONTAL_NORMAL
    }
//    val tim = Imaging.getMetadata(src).asInstanceOf[JpegImageMetadata].getExif
//    log.debug(s"TIM=$tim")
//    val tag = tim.findField(TiffTagConstants.TIFF_TAG_ORIENTATION)
//    log.debug(s"Fields = ${tim.getItems.asScala.toSeq}")
//    log.debug(s"Tag=$tag")
//    val orientation = tag.getIntValue

//    val orientation = 0
//    log.debug(s"Orientation is: $orientation")
//    orientation
  }

  private def samplePicture(): Array[Byte] = {
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

//    Base64.getEncoder.encodeToString(baos.toByteArray)
    baos.toByteArray
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
