package com.aimplicits.gallery

import scala.scalajs.js
import js.annotation._

@js.native
@JSImport("dist/amazon-cognito-identity.js", "CognitoUserPool")
class CognitoUserPool(userPoolData: Map[String, String]) extends js.Object {
// def signUp(): String = js.native
}

@JSExport
object MyApp {

  @JSExport
  def main(): Unit = {
    println("hi, ScalaJS!")

//    val pool = new CognitoUserPool(Map("UserPoolId" -> "TODO", "ClientId" -> "TODO"))

//    println("pool=" + pool)
//    val signedUp = pool.signUp()
//    println("signedUp=" + signedUp)

  }
}