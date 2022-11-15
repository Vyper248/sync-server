const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

const { mergeData, filterDeleted } = require('./utils');

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const globalStorage = {};

app.get('/', (req, res) => {
    console.log(globalStorage);
    res.json({status: 'Ready'});
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
            if (obj.type === 'failed') return res.json({status: 'error', data: 'Sync Failed'});
            else if (obj.type === 'down') return res.json({status: 'success', data: filterDeleted(obj.objects)});
            else if (obj.type === 'merge') return res.json({status: 'success', data: obj.objects});
            else return res.json({status: 'success', data: 'Sync Complete'});
        }
        numberChecks++;
        if (numberChecks > 58) {
            clearInterval(interval);
            delete globalStorage[id];
            res.json({status: 'error', data: 'Sync Timed Out - Please complete the sync within 30 seconds'});
        }
    }, 500);
});

app.post('/api/receive', (req, res) => {
    let obj = req.body;
    let id = obj.uniqueID;
    let sentObj = globalStorage[id];

    if (!sentObj) return res.json({status: 'error', data: 'Failed - no data found'});

    if (obj.appId !== sentObj.appId) {
        sentObj.type = 'failed';
        sentObj.syncComplete = true;
        return res.json({status: 'error', data: 'This data is from a different app.'});
    }

    if (sentObj.type === 'up') { //if up, merge sent object to receiving device
        sentObj.syncComplete = true;
        return res.json({status: 'success', data: filterDeleted(sentObj.objects)});
    } else if (sentObj.type === 'down') { //if down, merge receiving object to sent device
        sentObj.objects = obj.objects;
        sentObj.syncComplete = true;
        return res.json({status: 'success', data: 'Sync Complete'});
    } else if (sentObj.type === 'merge') { //if merge, merge objects and send back to both devices
        let returnData = mergeData(sentObj.objects, obj.objects);
        sentObj.objects = returnData;
        sentObj.syncComplete = true;
        return res.json({status: 'success', data: returnData});
    } else { //if wrong type, fail sync
        sentObj.syncComplete = true;
        sentObj.type = 'failed';
        return res.json({status: 'error', data: 'Failed - Incorrect Type'});
    }
});

const port = process.env.PORT || 8080;
const ip = process.env.IP;

app.listen(port, ip, () => {
    console.log('Listening on port ', port);
});