import axios from 'axios';
import * as fs from 'fs';
import cheerio from 'cheerio';
require('dotenv').config()

interface Scan {
    location: string;
    details: string;
}

interface ShipmentInfo {
    waybillNo: string;
    scans: Scan[];
}

async function fetchAndCompareData(url: string, tempFilePath: string, pushoverUserKey: string, pushoverAppToken: string) {
    try {
        console.log('Fetching HTML content...');
        // Fetch the HTML content
        const response = await axios.get(url);
        const htmlContent = response.data;
        console.log('HTML content fetched successfully.');

        // Extract shipment info and scans
        console.log('Extracting shipment info and scans...');
        const shipmentInfo = extractShipmentInfo(htmlContent);
        console.log('Shipment info extracted successfully:', shipmentInfo);

        // Check if there are new scans
        console.log('Checking for new scans...');
        const isNewScan = await hasNewScan(shipmentInfo, tempFilePath);
        console.log('New scan found:', isNewScan);

        // If there's a new scan, send a Pushover notification
        if (isNewScan) {
            console.log('Sending Pushover notification...');
            const latestScan = shipmentInfo.scans[0];
            sendPushoverNotification(latestScan, pushoverUserKey, pushoverAppToken);
            console.log('Pushover notification sent successfully.');
        }

        // Save the current shipment info to the temp file
        console.log('Saving data to file...');
        saveDataToFile(shipmentInfo, tempFilePath);
        console.log('Data saved to file successfully.');
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

function extractShipmentInfo(htmlContent: string): ShipmentInfo {
    const $ = cheerio.load(htmlContent);

    // Extract shipment info
    const waybillNo = $('#SHIP89812865391 tbody tr:nth-child(1) td').text().trim();

    // Extract scans
    const scans: Scan[] = [];
    $('#SCAN89812865391 tbody tr').each((index, element) => {
        const location = $(element).find('td:nth-child(1)').text().trim();
        const details = $(element).find('td:nth-child(2)').text().trim();
        scans.push({ location, details });
    });

    return {
        waybillNo,
        scans
    };
}

async function hasNewScan(currentData: ShipmentInfo, tempFilePath: string): Promise<boolean> {
    try {
        // Read the data from the temp file
        console.log('Reading data from file...');
        const previousData = await readDataFromFile(tempFilePath);
        console.log('Data read from file:', previousData);

        // Compare the current scans with the previous scans
        const previousScans = previousData ? previousData.scans : [];
        const newScan = currentData.scans.find(scan => !previousScans.some(prevScan => prevScan.location === scan.location && prevScan.details === scan.details));

        return !!newScan;
    } catch (error) {
        // If the temp file doesn't exist or there's any other error, consider it as a new scan
        console.log('Error reading data from file:', error);
        return true;
    }
}

function readDataFromFile(filePath: string): Promise<ShipmentInfo | null> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                // If the file doesn't exist, return null
                if (err.code === 'ENOENT') {
                    resolve(null);
                } else {
                    reject(err);
                }
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

function saveDataToFile(data: ShipmentInfo, filePath: string) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sendPushoverNotification(scan: Scan, userKey: string, appToken: string) {
    // Prepare the Pushover message
    const message = {
        token: appToken,
        user: userKey,
        title: 'New Scan Update',
        message: `New scan: ${scan.location} - ${scan.details}`
    };

    // Send the Pushover message
    axios.post('https://api.pushover.net/1/messages.json', message)
        .then(() => console.log('Pushover notification sent successfully'))
        .catch(error => console.error('Error sending Pushover notification:', error));
}

// Main function
async function main() {
    const url = 'https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=89812865391';
    const tempFilePath = 'temp.json';
    const pushoverUserKey = process.env.PUSHOVER_USER_KEY;
    const pushoverAppToken = process.env.PUSHOVER_APP_TOKEN;

    console.log({
        pushoverUserKey,
        pushoverAppToken
    })

    await fetchAndCompareData(url, tempFilePath, pushoverUserKey, pushoverAppToken);
}

// Run the main function
main();
