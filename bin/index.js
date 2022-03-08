#! /usr/bin/env node

const chalk = require("chalk");
const boxen = require("boxen");
const inquirer = require("inquirer");
const utils = require("./utils.js");
var fs = require("fs");
const yargs = require("yargs");
const path = require("path");

if (yargs.argv._[0] == null) {
  utils.showHelp();
}

yargs.command({
  command: "config",
  describe: "connecting to database",
  builder: {},
  handler: function (argv) {
    if (argv.host && argv.user && argv.psw) {
      utils.connectToDb(argv.host, argv.user, argv.psw);
    } else {
      inquirer
        .prompt([
          {
            name: "host",
            message: "Mysql host url",
          },
          {
            name: "username",
            message: "Mysql username",
          },
          {
            name: "password",
            message: "Mysql password",
          },
          {
            name: "mongoUrl",
            message: "mongodb url",
          },
          {
            name: "baseDb",
            message: "base database",
          },
        ])
        .then((answers) => {
          if (answers.host && answers.username && answers.password) {
            fs.writeFile("logs.log", "", function () {});  
            utils.connectToDb(
              answers.host,
              answers.username,
              answers.password,
              answers.mongoUrl,
              answers.baseDb
            );
          }
        });
    }
  },
});

yargs.command({
  command: "exec",
  describe: "connecting to database",
  builder: {
    all: {
      describe: "all tenant database",
      demandOption: false,
      type: "boolean",
    },
    custom: {
      describe: "custom tenant databases",
      demandOption: false,
      type: "boolean",
    },
  },
  handler: function (argv) {
    fs.writeFile("logs.log", "", function () {});
    if (argv.all == true) {
      inquirer
        .prompt([
          {
            name: "query",
            message: "paste the query",
          },
        ])
        .then((answers) => {
          if (answers.query && answers.query != "") {
            utils.execute(answers.query);
          } else {
            console.log("❎ execution failed! Query not provided.");
          }
        });
    } else if (argv.custom == true) {
      inquirer
        .prompt([
          {
            name: "databases",
            message: "Enter Database names (db1,db2...)",
          },
          {
            name: "query",
            message: "paste the query",
          },
        ])
        .then((answers) => {
          if (
            answers.databases &&
            answers.query &&
            answers.query != "" &&
            answers.databases != ""
          ) {
            let dbs = answers.databases.split(",");
            utils.executeCustom(dbs, answers.query);
          } else {
            console.log("❎ execution failed! some inputs are missing.");
          }
        });
    } else {
      console.log("give a valid command!");
    }
  },
});

yargs.command({
  command: "view-logs",
  describe: "view execution logs",
  handler: function (argv) {
    fs.readFile("logs.log", "utf8", async function (err, data) {
      console.log(data);
      if (err) console.log(err);
    });
  },
});

yargs.parse();
