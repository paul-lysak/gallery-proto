package com.aimplicits.gallery

import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.Context
import org.slf4j.LoggerFactory;

class SampleLambda extends RequestHandler[java.util.Map[String, AnyRef], String]{
  //TODO
  override def handleRequest(input: java.util.Map[String, AnyRef], context: Context): String = {
    println("stdout: got the request: "+input.toString)
    log.debug("upd: got the request: "+input.toString)
//    log.info("dbg: got the request: "+input.toString)

    s"""{"msg": "In reponse to: ${input.toString.length}"}""".stripMargin
  }

  private val log = LoggerFactory.getLogger(classOf[SampleLambda])
}