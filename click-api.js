const axios = require("axios");
const fs = require("fs");
const { configDotenv } = require("dotenv");
configDotenv();
const { parseCsvFile } = require("./helpers/csv-parser");

const EFFICIENCY = 0.75;
// Replace with your API endpoint

// Define parameters for the API call if required (modify as needed)
const users = JSON.parse(
  fs.readFileSync("clickup-user-data/user-metadata.json")
);

async function fetchData() {
  const userAttendanceJson = await parseCsvFile(
    "clickup-user-data/user-attendance.csv"
  );
  const userAttendanceMap = {};
  userAttendanceJson.forEach((u) => {
    const emailPrefix = u.EmailId.split("@")[0];
    userAttendanceMap[emailPrefix] = {
      totalPresentDays: parseFloat(u.Nov2024) + parseFloat(u.Dec2024),
      name: u.EmployeeName,
      email: u.EmployeeEmail,
      emailPrefix: emailPrefix,
    };
  });
  const userOutputData = [];
  for (const user of users) {
    try {
      const userTasks = [];
      let lastPage = false;
      let count = 0;
      console.log("Getting Data for", user.userName, new Date());
      while (!lastPage) {
        try {
          console.log(`Making API call: ${count}`, new Date());
          var config = {
            method: "get",
            url: `https://api.clickup.com/api/v2/team/3409307/task?assignees%5B%5D=${user.clickUpId}&include_closed=true&date_created_gt=1727740800000&date_created_lt=1735603200000&page=${count}`,
            headers: {
              Authorization: process.env.CLICKUP_ACCESS_TOKEN,
              accept: "application/json",
            },
          };

          const { data } = await axios(config);
          // console.log(data)
          // Store the response data
          userTasks.push(...data.tasks);
          lastPage = data.last_page;
          count++;
        } catch (error) {
          console.error(`Error fetching data for page:`, error.message);
          userTasks.push({ error: error.message });
        }
      }
      const fileName = user.userName.split(" ").join(".");
      fs.writeFileSync(
        `clickup-user-data/${fileName}.json`,
        JSON.stringify(userTasks, null, 2)
      );
      const userTaskData = userTasks.reduce(
        (prev, next) => {
          if (next.time_spent) {
            prev.timeTrackedInMs += next.time_spent;
          } else {
            console.log("Time Spent not found for", next.custom_id, next.id);
          }
          prev.taskCount += 1;
          if (next.points) {
            prev.sprintPoints += next.points;
          } else {
            console.log("Sprint Points not found for", next.custom_id, next.id);
          }
          return prev;
        },
        { timeTrackedInMs: 0, taskCount: 0, sprintPoints: 0 }
      );

      function calculatePercentage(data, field, invalidValue) {
        const totalCount = data.length;
        const validCount = data.filter(
          (item) => item[field] !== invalidValue
        ).length;
        return (validCount / totalCount) * 100;
      }

      const descriptionPercentage = calculatePercentage(
        userTasks,
        "description",
        ""
      );
      const pointsPercentage = calculatePercentage(userTasks, "points", null);

      const timeTrackedPercentage = calculatePercentage(
        userTasks,
        "time_spent",
        undefined
      );

      const dueDatePercentage = calculatePercentage(
        userTasks,
        "due_date",
        null
      );

      const finalDescriptionPercentage =
        descriptionPercentage >= 80
          ? 6.25
          : (descriptionPercentage * 6.25) / 100;

      const finalStoryPercentage =
        pointsPercentage >= 50 ? 6.25 : (pointsPercentage * 6.25) / 100;

      const finalTimeTrackPercentage =
        timeTrackedPercentage >= 100
          ? 6.25
          : (timeTrackedPercentage * 6.25) / 100;

      const finalDueDatePercentage =
        dueDatePercentage >= 80 ? 6.25 : (dueDatePercentage * 6.25) / 100;

      const emailPrefix = user.userName.split(" ").join(".");
      userTaskData.timeTrackedInHrs = parseFloat(
        (userTaskData.timeTrackedInMs / (1000 * 60 * 60)).toFixed(2)
      );
      userTaskData.totalWorkingHours =
        userAttendanceMap[emailPrefix].totalPresentDays * 8.5;
      const efficiency =
        (userTaskData.timeTrackedInHrs / userTaskData.totalWorkingHours) *
        EFFICIENCY *
        100;
      userTaskData.efficiencyPercentage = efficiency > 100 ? 75 : efficiency;

      const finalPer =
        finalDescriptionPercentage +
        finalStoryPercentage +
        finalTimeTrackPercentage +
        finalDueDatePercentage +
        userTaskData.efficiencyPercentage;
      delete user._id;
      userOutputData.push({
        ...user,
        ...userAttendanceMap[emailPrefix],
        ...userTaskData,
        description: finalDescriptionPercentage,
        story_points: finalStoryPercentage,
        timeTracked: finalTimeTrackPercentage,
        dueDate: finalDueDatePercentage,
        persentage: finalPer,
      });
    } catch (error) {
      console.error(`Error fetching data for user :`, error.message);
    }
    await sleep();
  }

  fs.writeFileSync(
    `clickup-user-data/all-user-summary.json`,
    JSON.stringify(userOutputData, null, 2)
  );
}

// Execute the function
fetchData();

const sleep = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};
