const path = require('path');
const date = require('date-and-time');

const {parseCsvFile, writeJsonToCsv} = require('./helpers/csv-parser');
const projects = require('./projects-1.json')
function calculateDeliveryQuality(filter) {
  try {
    const filePath = path.join(__dirname, 'DC-2.1 - On Time Delivery.xlsx');
    const data = readExcel(filePath, 'Sheet1');
    // const filteredData = data.filter((row) => {
    //   const matchesMonth = filter.month ? row.Month?.toLowerCase() === filter.month.toLowerCase() : true;
    //   const matchesProject = filter.projectName ? row['Project Name']?.toLowerCase() === filter.projectName.toLowerCase() : true;
    //   const matchesPerson = filter.person ? row['Delivery owner']?.toLowerCase().includes(filter.person.toLowerCase()) : true;
    //   return matchesMonth && matchesProject && matchesPerson;
    // });

    // if (!filteredData.length) return noDataMessage(filter, "Delivery Quality");
    //
    // const { totalTestCases, totalPassedTests } = filteredData.reduce(
    //   (acc, entry) => {
    //     acc.totalTestCases += entry['Total Test Cases'] || 0;
    //     acc.totalPassedTests += entry['Tests Passed'] || 0;
    //     return acc;
    //   },
    //   { totalTestCases: 0, totalPassedTests: 0 }
    // );
    //
    // const percentage = totalTestCases > 0 ? ((totalPassedTests / totalTestCases) * 100).toFixed(2) : 0;
    // return `Month: ${filter.month || 'Overall'} | Person: ${filter.person || 'Any'} | Project: ${filter.projectName || 'Any'} | Delivery Quality Percentage: ${percentage}%.`;
  } catch (error) {
    console.error('Error in calculateDeliveryQuality:', error.message);
    return 'An error occurred while calculating Delivery Quality.';
  }
}

const quarterStartDate = date.parse('2024-10-01', 'YYYY-MM-DD');
const quarterEndDate = date.parse('2024-12-31', 'YYYY-MM-DD');
const calculateOnTimeDelivery = async (filter) => {
  try {
    const filePath = path.join(__dirname, 'DC-2.csv');
    const deliveries = await parseCsvFile(filePath);
    // console.log("deliveries::", deliveries);
    const persons = {};
    for (const delivery of deliveries) {
      const deliveryDateStr = delivery['Scheduled Delivery Date'];
      const actualDeliveryDateStr = delivery['Actual Delivery Date'];
      delivery.isOnTime = date.parse(actualDeliveryDateStr, 'M/D/YYYY') <= date.parse(deliveryDateStr, 'M/D/YYYY')
      const project = delivery['Project Name'];
      if(!deliveryDateStr || !project || !actualDeliveryDateStr) {
        console.log(`Missing required Data, skipping for Delivery:: Project Name: ${delivery['Project Name']}, Deliverables: ${delivery.Deliverables} Delivery Owner: ${delivery['Delivery Owner']}`)
        continue;
      }
      // const scheduledDeliveryDate = new Date(deliveryDateStr, { timeZone: 'America/New_York' });
      const scheduledDeliveryDate = date.parse(deliveryDateStr, 'M/D/YYYY');
      if(scheduledDeliveryDate < quarterStartDate || scheduledDeliveryDate > quarterEndDate) {
        console.log(`Delivery out of the Quarter:: ${project} - ${delivery.Deliverables} - ${deliveryDateStr} - ${delivery['Delivery Owner']}`);
        continue;
      }
      const projectFromJson = projects.find(p => p.projectName.toLowerCase() === project.toLowerCase());
      if(!projectFromJson) {
        console.log(`Project "${project}" not found from JSON file for Delivery ${delivery.Deliverables}`);
        continue;
      }
      const eligibleMembers = projectFromJson.members.filter(m => {
        if(!m.startDate) return true;
        if(m.startDate && m.endDate) {
          const memberStartDate = date.parse(m.startDate, 'YYYY-MM-DD');
          const memberEndDate = date.parse(m.endDate, 'YYYY-MM-DD');
          // if(delivery.Deliverables === "[AC-3626] KBO Route")
          return (scheduledDeliveryDate >= memberStartDate && scheduledDeliveryDate <= memberEndDate);
        }
      })
      eligibleMembers.forEach(m => {
        if(!persons[m.name]) persons[m.name] = [delivery];
        else persons[m.name].push(delivery);
      })
      
    }
    const personArr = [];
    for (const personsKey in persons) {
      console.log(personsKey, '::', persons[personsKey].length)
      const timelyDeliveries = persons[personsKey].filter(d => d.isOnTime).length;
      const timelyDeliveriesPercent = (timelyDeliveries/persons[personsKey].length*100).toFixed(2);
      personArr.push({Name: personsKey, 'Total Deliveries': persons[personsKey].length, 'Timely Deliveries': timelyDeliveries, 'Total Deliveries percent': timelyDeliveriesPercent})
    }
    await writeJsonToCsv(personArr,'dc-2.1-output-2024-12-20.csv')

    // const difference = persons['Devansh Kaneriya'].filter(item1 =>
    //   !persons['Megha Rana'].some(item2 => item2.Deliverables === item1.Deliverables)
    // );
    // console.log(difference)

  } catch (error) {
    console.error('Error in calculateOnTimeDelivery:', error.message);
    return 'An error occurred while calculating On-Time Delivery.';
  }
}
const filterOptions = { month: 'November' };
calculateOnTimeDelivery(filterOptions)
