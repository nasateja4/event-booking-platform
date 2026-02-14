
const fs = require('fs');
const path = require('path');

const logFile = 'found_files.txt';
fs.writeFileSync(logFile, 'Search Results:\n');

function searchFiles(dir, searchString) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                searchFiles(filePath, searchString);
            }
        } else {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes(searchString)) {
                    fs.appendFileSync(logFile, `MATCH: ${filePath}\n`);
                }
            } catch (e) {
                // Ignore
            }
        }
    }
}

searchFiles('c:\\Users\\User\\Desktop\\teja\\Event_Booking_Platform\\app', 'Slots booked successfully');
searchFiles('c:\\Users\\User\\Desktop\\teja\\Event_Booking_Platform\\components', 'Slots booked successfully');
