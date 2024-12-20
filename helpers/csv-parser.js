const csv = require('csv-parser')
const fs = require('fs')
const CsvWriter = require('csv-writer')


const parseCsvFile = async (filePath) => {
  if(!filePath) throw new Error();
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });

}

const writeJsonToCsv = async (jsonArray, outputFilePath) => {
  const createCsvWriter = CsvWriter.createObjectCsvWriter;
  if (!jsonArray || !Array.isArray(jsonArray) || jsonArray.length === 0) {
    throw new Error('Invalid JSON array');
  }

  // Dynamically create CSV headers from keys in the first object
  const headers = Object.keys(jsonArray[0]).map(key => ({ id: key, title: key }));

  const csvWriter = createCsvWriter({
    path: outputFilePath,
    header: headers,
  });

  try {
    await csvWriter.writeRecords(jsonArray);
    console.log(`CSV file was written to ${outputFilePath}`);
  } catch (error) {
    console.error('Error writing CSV file:', error);
  }
};

const writeJsonToFile = async (jsonArray, fileName) => {
  await fs.writeFileSync(fileName, JSON.stringify(jsonArray), {encoding: 'utf8'})
}
module.exports = {parseCsvFile, writeJsonToCsv, writeJsonToFile}
