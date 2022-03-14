var mysql = require("mysql");
const ora = require("ora");
var fs = require("fs");
const { MongoClient } = require("mongodb");
const _ = require("underscore");
const util = require("util");

var connection;
const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  transports: new transports.File({
    filename: "logs.log",
    format: format.combine(
      format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
      format.align(),
      format.printf(
        (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
      )
    ),
  }),
});

module.exports = {
  showHelp: showHelp,
  connectToDb: connectToDb,
  execute: execute,
  executeCustom: executeCustom,
};

function showHelp() {
  var logoCli = require("cli-logo"),
    logoConfig = {
      name: "KEBS Mysql CLI",
      description:
        "A CLI for performing database operations across multiple tenant databases",
      version: "1.0.0",
    };

  logoCli.print(logoConfig);
  console.log("commands:\r");
  console.log(
    "\tconfig\t\t      " + "config database connections" + "\t\t\t" + "stdin\r"
  );
  console.log(
    "\texec\t\t      " + "execute database operations" + "\t\t\t" + "stdin\r"
  );
  console.log(
    "\t\t--all\t\t      " +
      "execute for all tenant databases." +
      "\t\t\t" +
      "[boolean]\r"
  );
  console.log(
    "\t\t--custom\t      " +
      "for custom tenant databases." +
      "\t\t\t" +
      "[boolean]\r"
  );
  console.log("\tview-logs\t     " + "view execution logs" + "\t\t\t" + "\n");
  console.log("\nOptions:\r");
  console.log(
    "\t--version\t      " + "Show version number." + "\t\t" + "[boolean]\r"
  );
  console.log("\t--help\t\t      " + "Show help." + "\t\t\t" + "[boolean]\n");
}

function connectToDb(host, username, psw, mongoUrl, baseDb) {
  content = {
    host: host,
    user: username,
    password: psw,
    baseDb: baseDb,
  };

  fs.writeFile("connection.json", JSON.stringify(content), function (err) {
    if (err) throw err;
    console.log("mysql config Saved!");
  });

  fs.writeFile("mongocon.txt", mongoUrl, function (err) {
    if (err) throw err;
    console.log("mongo config Saved!");
  });
}

async function execute(query) {
  try {
    const throbber = ora({
      text: "",
      spinner: {
        frames: ["🐊", "🐢", "🦎", "🐍"],
        interval: 300, // Optional
      },
    }).start();

    let parsed_content;
    fs.readFile("mongocon.txt", "utf8", async function (err, data) {
      const client = new MongoClient(data);
      await client.connect();
      console.log("Connected successfully to mongo server");
      let result = await client
        .db("tenants_management")
        .collection("m_tenants")
        .find({ is_bot_active: true })
        .toArray();
      let dbs = _.uniq(result, "tad");
      dbs = _.pluck(dbs, "tad");

      fs.readFile("connection.json", "utf8", async function (err, data) {
        parsed_content = JSON.parse(data);
        var pool = await mysql.createPool({
          host: parsed_content.host,
          user: parsed_content.user,
          password: parsed_content.password,
          waitForConnections: true,
          multipleStatements: true,
          acquireTimeout: 1000000,
        });
        pool = await util.promisify(pool.query).bind(pool);

        let source_result = await pool(query);
        console.log(
          "-------------------------------------------------------------------------------------------------------------------------------------"
        );
        logger.info(
          "-----------------------------------------------------------------------------------------------------------------------------"
        );
        logger.info(query);
        console.log("executed ", query);
        console.log(JSON.stringify(source_result));
        logger.info(JSON.stringify(source_result));
        logger.info(
          "---------------------------------------------------------------------------------------------------------------------------------"
        );

        console.log(
          "-------------------------------------------------------------------------------------------------------------------------------------"
        );
        for (let i = 0; i < dbs.length; i++) {
          if (dbs[i] != parsed_content.baseDb) {
            let result = await pool(
              query.replace(parsed_content.baseDb, dbs[i])
            );
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------------"
            );
            logger.info(
              "-----------------------------------------------------------------------------------------------------------------------------------"
            );
            logger.info(query.replace(parsed_content.baseDb, dbs[i]));
            console.log(
              "executed ",
              query.replace(parsed_content.baseDb, dbs[i]),
              `progress  ${(i / dbs.length) * 100}% `
            );
            console.log(JSON.stringify(result));
            logger.info(JSON.stringify(result));
            logger.info(
              "-------------------------------------------------------------------------------------------------------------------------------------"
            );
            console.log(
              "-------------------------------------------------------------------------------------------------------------------------------------"
            );
          }

          if (i == dbs.length - 1) {
            console.log("Execution success ! 100% \n press ctrl + c to exit");
            throbber.stop();
            return 0;
          }
        }
      });
    });
  } catch (error) {
    logger.error(error);
  }
}

async function executeCustom(dbs, query) {
  try {
    const throbber = ora({
      text: "",
      spinner: {
        frames: ["🐊", "🐢", "🦎", "🐍"],
        interval: 300, // Optional
      },
    }).start();
    let parsed_content;
    fs.readFile("connection.json", "utf8", async function (err, data) {
      parsed_content = JSON.parse(data);
      var pool = await mysql.createPool({
        host: parsed_content.host,
        user: parsed_content.user,
        password: parsed_content.password,
        waitForConnections: true,
        multipleStatements: true,
        acquireTimeout: 1000000,
      });
      pool = await util.promisify(pool.query).bind(pool);

      let source_result = await pool(query);
      logger.info(
        "------------------------------------------------------------------"
      );
      logger.info(query);
      console.log("executed ", query);
      console.log(
        "*******************************************************************************************************************************************************"
      );

      console.log(JSON.stringify(source_result));
      console.log("---------------------------------------------------------");
      logger.info(JSON.stringify(source_result));
      logger.info(
        "------------------------------------------------------------------"
      );

      for (let i = 0; i < dbs.length; i++) {
        let result = await pool(query.replace(parsed_content.baseDb, dbs[i]));
        logger.info(
          "------------------------------------------------------------------"
        );
        logger.info(query.replace(parsed_content.baseDb, dbs[i]));
        console.log(
          "executed ",
          query.replace(parsed_content.baseDb, dbs[i]),
          `progress  ${(i / dbs.length) * 100}% `
        );
        console.log(
          "*******************************************************************************************************************************************************"
        );

        console.log(JSON.stringify(result));
        console.log(
          "----------------------------------------------------------------------"
        );

        logger.info(JSON.stringify(result));
        logger.info(
          "------------------------------------------------------------------"
        );
        if (i == dbs.length - 1) {
          console.log("Execution success ! 100% \n press ctrl + c to exit");
          throbber.stop();
          return 0;
        }
      }
    });
  } catch (error) {
    logger.error(error);
  }
}
