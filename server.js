const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const { mergeData, filterDeleted } = require('./utils');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const globalStorage = {};

app.get('/', (req, res) => {
    console.log(globalStorage);
    res.send('Checked');
});

app.post('/api/send', (req, res) => {
    let obj = req.body;
    let id = obj.uniqueID;
    globalStorage[id] = obj;

    let numberChecks = 0;
    let interval = setInterval(() => {
        if (globalStorage[id].syncComplete === true) {
            clearInterval(interval);
            delete globalStorage[id];
            if (obj.type === 'failed') return res.send('Sync Failed');
            else if (obj.type === 'down') return res.send(filterDeleted(obj.objects));
            else if (obj.type === 'merge') return res.send(obj.objects);
            else return res.send('Sync Complete');
        }
        numberChecks++;
        if (numberChecks > 120) {
            clearInterval(interval);
            delete globalStorage[id];
            res.send('Sync Timed Out - Please complete the sync within 1 minute');
        }
    }, 500);
});

app.post('/api/receive', (req, res) => {
    let obj = req.body;
    let id = obj.uniqueID;
    let sentObj = globalStorage[id];

    if (!sentObj) return res.send('Failed - no data found');

    if (obj.appId !== sentObj.appId) {
        sentObj.type = 'failed';
        sentObj.syncComplete = true;
        return res.send('This data is from a different app.');
    }

    if (sentObj.type === 'up') { //if up, merge sent object to receiving device
        sentObj.syncComplete = true;
        return res.send(filterDeleted(sentObj.objects));
    } else if (sentObj.type === 'down') { //if down, merge receiving object to sent device
        sentObj.objects = obj.objects;
        sentObj.syncComplete = true;
        return res.send('Sync Complete');
    } else if (sentObj.type === 'merge') { //if merge, merge objects and send back to both devices
        let returnData = mergeData(sentObj.objects, obj.objects);
        sentObj.objects = returnData;
        sentObj.syncComplete = true;
        return res.send(returnData);
    } else { //if wrong type, fail sync
        sentObj.syncComplete = true;
        sentObj.type = 'failed';
        return res.send('Failed - Incorrect Type');
    }
});

const port = process.env.PORT || 8080;
const ip = process.env.IP;

app.listen(port, ip, () => {
    console.log('Listening on port ', port);
});