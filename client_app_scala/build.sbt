enablePlugins(ScalaJSPlugin, WorkbenchPlugin, ScalaJSBundlerPlugin)
//enablePlugins(ScalaJSPlugin, WorkbenchPlugin)

name := "gallery-proto"

organization := "org.aimplicits"

version := "0.1-SNAPSHOT"

scalaVersion := "2.11.8"

libraryDependencies ++= Seq(
  "org.scala-js" %%% "scalajs-dom" % "0.9.1",
  "com.lihaoyi" %%% "scalatags" % "0.6.1"
//  "org.webjars.npm" % "amazon-cognito-identity-js" % "1.19.0"
)

//jsDependencies ++= Seq(
//  "org.webjars.npm" % "aws-sdk" % "2.10.0" / "dist/aws-sdk.js",
//  "org.webjars.npm" % "amazon-cognito-identity-js" % "1.19.0" / "dist/aws-cognito-sdk.js" commonJSName "AWSCognitoSDK", // dependsOn "dist/aws-sdk.js",
//  "org.webjars.npm" % "amazon-cognito-identity-js" % "1.19.0" / "dist/amazon-cognito-identity.js" dependsOn "dist/aws-cognito-sdk.js"
//)

npmDependencies in Compile ++= Seq(
  "amazon-cognito-identity-js" -> "1.19.0"
)

//Customize generated JavaScript location
//crossTarget in (Compile, fullOptJS) := (classDirectory in Compile).value / "public" / "javascripts"
//crossTarget in (Compile, fastOptJS) := (classDirectory in Compile).value / "public" / "javascripts"
