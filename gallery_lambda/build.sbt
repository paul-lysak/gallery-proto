name := "gallery-lambda"

version := "0.1-SNAPSHOT"

scalaVersion := "2.12.3"

libraryDependencies ++= Seq(
  "com.amazonaws" % "aws-lambda-java-core" % "1.1.0",
  "com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0",
  "com.amazonaws.serverless" % "aws-serverless-java-container-core" % "0.5.1",
  "com.amazonaws" % "aws-java-sdk-cognitoidp" % "1.11.176",
//  "com.nimbusds" % "nimbus-jose-jwt" % "4.23",
  "org.slf4j" % "slf4j-log4j12" % "1.7.25",
//  "commons-io" % "commons-io" % "2.4" % "test",
  "org.scalatest" %% "scalatest" % "3.0.1" % "test"
)