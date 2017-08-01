package com.aimplicits.gallery

import scala.scalajs.js
import js.annotation._

//@js.native
//@JSImport("dist/amazon-cognito-identity.js", "CognitoUserPool")
//class CognitoUserPool(userPoolData: Map[String, String]) extends js.Object {
// def signUp(): String = js.native
//}

@JSExport
object MyApp {

  @JSExport
  def main(): Unit = {
    println("Hi, ScalaJS!")

//    val poolParams = Map("UserPoolId" -> "TODO", "ClientId" -> "TODO")
//    println("pool params =" + poolParams)
//    val pool = new CognitoUserPool(poolParams)

//    println("pool=" + pool)
//    val signedUp = pool.signUp()
//    println("signedUp=" + signedUp)

  }
}