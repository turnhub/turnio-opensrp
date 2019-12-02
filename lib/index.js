const TurnIntegration = require("@turnio/integration");

const request = require("request");

const debug = require("debug")("turn:opensrp");

const _ = require("lodash");

const moment = require("moment");

const table_for = (kind, record) => {
  switch (kind) {
    case "child":
      return table_rows_for("Child", _(record));

    case "mother":
      return table_rows_for("Mother", _(record));

    default:
      return table_for_unknown(kind, _(record));
  }
};

const table_rows_for = (prfx, record) => {
  const prefix = val => `${prfx} ${val}`;

  const identifiers = record.get("identifiers", {});
  const tableRows = [[prefix("Name"), `${record.get("firstName")} ${record.get("lastName")}`], [prefix("Gender"), record.get("gender")], [prefix("ID"), _(identifiers).entries().reject(([key, value]) => value.indexOf("-") > -1).map(([key, value]) => `${key}: ${value}`).join(", ")], [prefix("Address"), record.get("addresses", []).map(address => address.addressFields.address2).join(", ")]];
  const homeFacility = record.get("attributes.Home_Facility");

  if (homeFacility) {
    tableRows.push([prefix("Home facility"), homeFacility]);
  }

  const birthDate = record.get("birthdate");

  if (birthDate) {
    tableRows.push([prefix("Date of Birth"), moment(birthDate).format("lll")]);
  }

  const deathDate = record.get("deathdate");

  if (deathDate) {
    tableRows.push([prefix("Date of Death"), moment(deathDate).format("lll")]);
  }

  return tableRows;
};

const table_for_unknown = (kind, record) => {
  {
    "Unknown kind", kind;
  }
};

const app = new TurnIntegration(process.env.SECRET).ignoreSignature()
/**
 * Generate a menu item for kicking off a task in the Turn UI
 *
 * This still needs to be implemented, right now it just displays a menu item.
 */
.action(({
  chat,
  messages
}) => [{
  description: "Mark a Task as completed",
  payload: {
    taskId: "can be anything really"
  },
  callback: ({
    message,
    option,
    payload: {
      taskId
    }
  }, resp) => {
    debug("Mark a Task menu item clicked!"); // Notify the frontend to refresh the context automatically

    resp.setHeader("X-Turn-Integration-Refresh", "true");
    return {
      ok: "call initiated"
    };
  }
}])
/**
 * Generate the table with patient info in Turn's context panel on the left
 *
 * This does a rough table based on the schema I'm able to see atm
 */
.context("OpenSRP Patient Records", "table", ({
  chat,
  messages
}) => {
  return new Promise((resolve, reject) => {
    request.get(`${process.env.OPENSRP_ENDPOINT}/opensrp/rest/search/path`, {
      auth: {
        user: process.env.OPENSRP_USERNAME,
        password: process.env.OPENSRP_PASSWORD,
        sendImmediately: true
      },
      qs: {
        // hard coded, this would otherwise be `chat.owner`
        // without the + country code prefix
        contact_phone_number: "08641237"
      }
    }, function (error, openSrpResponse, openSrpData) {
      if (error) {
        reject(error);
      } else {
        const [results] = JSON.parse(openSrpData);
        const tableRows = Object.keys(results).reduce((accumulator, key) => {
          const new_rows = table_for(key, results[key]);
          return accumulator.concat(new_rows);
        }, []);
        resolve(_.fromPairs(tableRows));
      }
    });
  });
}).serve();
module.exports = app;