name := "gallery_resizer_lambda"

version := "0.1-SNAPSHOT"

scalaVersion := "2.12.3"

libraryDependencies ++= Seq(
  "com.amazonaws" % "aws-lambda-java-core" % "1.1.0",
  "com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0",
  "com.amazonaws.serverless" % "aws-serverless-java-container-core" % "0.5.1",
  "com.amazonaws" % "aws-java-sdk-s3" % "1.11.176",
  "com.drewnoakes" % "metadata-extractor" % "2.10.1",
  "org.apache.commons" % "commons-imaging" % "1.0-SNAPSHOT",
    "commons-io" % "commons-io" % "2.4",
  "org.slf4j" % "slf4j-log4j12" % "1.7.25",
  "org.scalatest" %% "scalatest" % "3.0.1" % "test"
)

resolvers += "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/"