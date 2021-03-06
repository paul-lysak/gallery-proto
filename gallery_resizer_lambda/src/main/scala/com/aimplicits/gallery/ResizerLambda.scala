package com.aimplicits.gallery

import java.awt.geom.AffineTransform
import java.awt.{Color, Font, RenderingHints}
import java.awt.image.{AffineTransformOp, BufferedImage}
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import java.net.URLDecoder
import java.util.Base64
import javax.imageio.ImageIO

import com.amazonaws.AmazonServiceException
import com.amazonaws.serverless.proxy.internal.model.{AwsProxyRequest, AwsProxyResponse}
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.s3.AmazonS3ClientBuilder
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.{ExifDirectoryBase, ExifIFD0Directory}
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


    val filePathOpt: Option[String] = pathParams.get(FILE_PATH_PARAM)
      .orElse(queryParams.get(FILE_PATH_PARAM))
      .map(URLDecoder.decode(_, "UTF-8"))
    val wOpt = queryParams.get(WIDTH_PARAM).flatMap(toIntOpt("w"))
    val hOpt = queryParams.get(HEIGHT_PARAM).flatMap(toIntOpt("h"))

    (wOpt, hOpt, filePathOpt) match {
      case (None, None, _) => fail(s"Neither $WIDTH_PARAM, nor $HEIGHT_PARAM query parameter not specified")
      case (_, _, None) => fail(s"$FILE_PATH_PARAM path or query parameter not specified")
      case (wO, hO, Some(filePath)) if extensionIs(filePath, "jpg", "jpeg") =>
        log.debug(s"Bucket: ${params.galleryBucket}, folder: ${params.galleryFolder}")
        try {
          val res = new AwsProxyResponse(200,
            Map("Content-Type" -> "image/jpeg").asJava,
            getScaled(filePath, wO, hO)
          )
          res.setBase64Encoded(true)
          res
        } catch {
          case e: AmazonServiceException if e.getErrorCode == "NoSuchKey" =>
            fail("File not found: "+filePath, 404)
        }
      case (wO, hO, Some(filePath)) if extensionIs(filePath, "avi", "mov", "mp4", "gp3") =>
        placeholderIcon("Video", wO, hO)
      case (wO, hO, Some(filePath)) if extensionIs(filePath, "png") =>
        placeholderIcon("PNG", wO, hO)
      case (wO, hO, Some(filePath)) =>
        placeholderIcon("?", wO, hO)
    }
  }

  private def extensionIs(fileName: String, exts: String*): Boolean = {
    val f = fileName.toLowerCase
    val lastPoint = f.lastIndexOf(".")
    if(lastPoint < 0 || lastPoint == f.length - 1) {
      false
    } else {
      val ext = f.substring(lastPoint + 1)
      exts.contains(ext)
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

  private def normalizeOrientation(src: BufferedImage, orientation: Int): BufferedImage = {
    if(orientation == EXIF_ORIENTATION_NORM) {
      src
    } else {
      val at = new AffineTransform();
      orientation match {
        case 1 => //norm
        case 2 => // Flip X
          at.scale(-1.0, 1.0);
          at.translate(-src.getWidth, 0);
        case 3 => // PI rotation
          at.translate(src.getWidth(), src.getHeight())
          at.quadrantRotate(2)
        case 4 => // Flip Y
          at.scale(1.0, -1.0)
          at.translate(0, -src.getHeight())
        case 5 => // - PI/2 and Flip X
          at.quadrantRotate(3)
          at.scale(-1.0, 1.0)
        case 6 => // -PI/2 and -width
          at.translate(src.getHeight(), 0)
          at.quadrantRotate(1)
        case 7 => // PI/2 and Flip
          at.scale(-1.0, 1.0)
          at.translate(-src.getHeight(), src.getWidth)
          at.quadrantRotate(3)
        case 8 => // PI / 2
          at.translate(0, src.getWidth())
          at.quadrantRotate(3)
        case other =>
          log.warn(s"Unknown orientation: $other")
      }

      val (dstW, dstH) = orientation match {
        case 3 | 6 => (src.getHeight, src.getWidth)
        case _ => (src.getWidth, src.getHeight)
      }

      val atOp = new AffineTransformOp(at, AffineTransformOp.TYPE_BILINEAR);
      val dstImg = new BufferedImage(dstW, dstH, src.getType)
      atOp.filter(src, dstImg)
      dstImg
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
    val o = getOrientation(fileName, src)

    //TODO normalize orientation for scaled image rather than original size, it should require less resources
    val img = normalizeOrientation(ImageIO.read(new ByteArrayInputStream(src)), o)

    val srcW = img.getWidth
    val srcH = img.getHeight

    val (dstW, dstH) = calculateDstDimensions(srcW, srcH, maxW, maxH)

    log.debug(s"Original size: $srcW*$srcH, scaling to: $dstW*$dstH. Orientation: $o")
    val dstImg = new BufferedImage(dstW, dstH, img.getType)
    val g = dstImg.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
    RenderingHints.VALUE_INTERPOLATION_BILINEAR);

    g.drawImage(img, 0, 0, dstW, dstH, 0, 0, img.getWidth(), img.getHeight(), null);
    g.dispose()

    val baos = new ByteArrayOutputStream()
    ImageIO.write(dstImg, "jpg", baos)
    baos.toByteArray
  }

  private def getOrientation(fileName: String, src: Array[Byte]): Int = {
    val md = ImageMetadataReader.readMetadata(new ByteArrayInputStream(src))
    Option(md.getFirstDirectoryOfType(classOf[ExifIFD0Directory])) match {
      case Some(imDir) if(imDir.containsTag(ExifDirectoryBase.TAG_ORIENTATION)) =>
        val o = imDir.getInt(ExifDirectoryBase.TAG_ORIENTATION)
        log.debug(s"Orientation of $fileName: $o")
        o
      case _ =>
        log.debug(s"No orientation metadata directory in $fileName, assuming default orientation $EXIF_ORIENTATION_NORM")
        EXIF_ORIENTATION_NORM
    }
  }


  private def fitText(text: String, maxW: Option[Int], maxH: Option[Int]): Array[Byte] = {
    val probeFontSize = 120
    val (srcW, srcH) = {
      val probeFont = new Font("Arial", Font.PLAIN, probeFontSize);
      val probeImg = new BufferedImage(1, 1, BufferedImage.TYPE_3BYTE_BGR)
      val g = probeImg.createGraphics();
      g.setFont(probeFont);
      val fm = g.getFontMetrics();
      g.dispose()
      (fm.stringWidth(text), fm.getHeight)
    }

    val (dstW, dstH) = calculateDstDimensions(srcW, srcH, maxW, maxH)
    val scale = {
      val scaleX = dstW.toDouble / srcW.toDouble
      val scaleY = dstH.toDouble / srcH.toDouble
      if(scaleX < scaleY) scaleX else scaleY
    }

    val scaledFontSize: Int = (probeFontSize*scale).toInt
    val img = new BufferedImage(dstW, dstH, BufferedImage.TYPE_3BYTE_BGR)
    val g = img.createGraphics()
    g.setColor(Color.WHITE)
    g.fillRect(0,0, dstW, dstH)
    g.setFont(new Font("Arial", Font.PLAIN, scaledFontSize))
    val fm = g.getFontMetrics
    g.setColor(Color.BLACK);
    g.drawString(text, 0, fm.getAscent());

    g.dispose()

    val baos = new ByteArrayOutputStream()
    ImageIO.write(img, "jpg", baos)

    Base64.getEncoder.encodeToString(baos.toByteArray)
    baos.toByteArray
  }

  private def placeholderIcon(text: String, maxW: Option[Int], maxH: Option[Int]): AwsProxyResponse = {
    val imgBytes = fitText(text, maxW, maxH)
    val res = new AwsProxyResponse(200,
      Map("Content-Type" -> "image/jpeg").asJava,
      Base64.getEncoder.encodeToString(imgBytes)
    )
    res.setBase64Encoded(true)
    res
  }

  private def fail(msg: String, httpCode: Int = 400): AwsProxyResponse = {
      new AwsProxyResponse(httpCode,
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

  private val EXIF_ORIENTATION_NORM = 1

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
