const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs');
const cors = require('cors');

var corsOptions = {
    origin: 'http://localhost:9000',
    optionsSuccessStatus: 200 // For legacy browser support
}

const app = express();

app.use(bodyParser.json());
app.use(cors(corsOptions));

const mysql = require('promise-mysql');
const { resolve } = require("path");

const getDbConnection = async () => {
    return mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "test"
    });
}


const unApprovedLoans = "unApprovedLoans.json";
const users = "user.json";
const approvedLoans = "approvedLoans.json";

var appendData = function(fileName, data){
    // data = JSON.stringify(data);
    var fdata = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    // console.log(data,fdata);
    if(fdata.length<=0){
        fdata = [data];
    }else{
        fdata.push(data);
    }
    fdata = JSON.stringify(fdata);
    fs.writeFileSync(fileName, fdata, (err) => {
        if (err) {
            return false;
        }
    });
    return true;
}

var overwritefile = function(fileName, data){
    var fdata = JSON.stringify(data);
    fs.writeFileSync(fileName, fdata, (err) => {
        if (err) {
            return false;
        }
    });
}

const getValidResponseFormat = (data) =>{
    return JSON.parse(JSON.stringify(data));
}

const getUser = async (data) => {
    return new Promise( async (resolve, reject) => {
        const db = await getDbConnection();
        console.log("dbcon",db);
        const user = await db.query("SELECT * FROM user where userId='" + data.userId + "' and password='" + data.password + "'");
        await db.end();
        var res = getValidResponseFormat(user);
        console.log("final res",res[0]);
        (res[0] === undefined) ? resolve({ "role": "invalid" }) : resolve(res[0]);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve({ "role": "invalid" });
    });
}
  
var authUser = async function(fileName, data){
    var fdata = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    var userObject = {"role":"invalid"};
    fdata.forEach(element => {
        if(element['userId']===data.userId && element['password']===data.password){
            userObject = element;
        }
    });
    console.log("logging in",data,userObject.role);
    return userObject;
}

var approveLoan = function(data){
    var fdata = JSON.parse(fs.readFileSync(unApprovedLoans, 'utf8'));
    var remainingUnApproved = [];
    fdata.forEach(telement => {
        var element = JSON.parse(telement);
        if(element['userId']===data.userId && element['dateOfApply']===data.dateOfApply){
            appendData(approvedLoans,JSON.stringify(data));
        }else{
            remainingUnApproved.push(JSON.stringify(element));
        }
    });

    overwritefile(unApprovedLoans,remainingUnApproved);
}

var rejectLoan = function(data){
    var fdata = JSON.parse(fs.readFileSync(unApprovedLoans, 'utf8'));
    objIndex = fdata.findIndex((obj => {
        var element = JSON.parse(obj);
        return element['userId']===data.userId && element['dateOfApply']===data.dateOfApply;
    }));
    fdata[objIndex] = JSON.stringify(data);
    overwritefile(unApprovedLoans, fdata);
}

var getApprovedLoansByUser = function(fileName, data){
    var fdata = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    var result = [];
    fdata.forEach(telement => {
        var element = JSON.parse(telement);
        if(element["userId"]===data.userId){
            result.push(element);
        }
    });
    return result;
}

var getUnApprovedLoansByUser = function(fileName, data){
    var fdata = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    var result = [];
    if(data['all']){
        fdata.forEach(telement => {
            var element = JSON.parse(telement);
            if(element["status"]==="Pending"){
                result.push(JSON.stringify(element));
            }
            console.log("unapproved loans: ",result.length);
        });
    }else{
        fdata.forEach(telement => {
            var element = JSON.parse(telement);
            if(element["userId"]===data.userId){
                result.push(element);
            }
        });
    }
    return result;
}


const sayHi = (req, res) => {
    res.send("Hi!");
};

app.post("/applyLoan", (req, res) => {
    const loanObject = JSON.stringify(req.body);
    console.log("Apply Loan:",loanObject);
    appendData(unApprovedLoans, loanObject);
    res.send(`Loan Object saved`);
});

app.post("/authUser",(req, res) =>{
    const userobj = req.body;
    console.log("authUser:",userobj);
    
    // var promise = getUser(userobj);
    // promise.then((resp)=>{
    //     res.send(resp);
    // }).catch((err)=>{
    //     res.send({"role":"invalid"});
    // });
    
    res.send(authUser(users,userobj));
});

app.post("/getLoans",(req, res) =>{
    var userobj = req.body;
    console.log("getloans:",userobj);
    res.send(getApprovedLoansByUser(approvedLoans,userobj));
});

app.post("/getLoansAll",(req, res) =>{
    var userobj = req.body;
    console.log("getloansAll:",userobj);
    res.send(getApprovedLoansByUser(approvedLoans,userobj));
});

app.post("/getUnApprovedLoans",(req, res) =>{
    var userobj = req.body;
    console.log("getUnApprovedLoans:",userobj);
    res.send(getUnApprovedLoansByUser(unApprovedLoans,userobj));
});

app.get("/getAllUnApprovedLoans",(req, res) =>{
    console.log("getAllUnApprovedLoans");
    res.send(getUnApprovedLoansByUser(unApprovedLoans,{"all":"true"}));
});

app.post("/approveLoan",(req, res) =>{
    var loanObj = req.body;
    console.log("approving loan:",loanObj);
    res.send(approveLoan(loanObj));
});

app.post("/rejectLoan",(req, res) =>{
    var loanObj = req.body;
    console.log("rejecting loan:",loanObj);
    res.send(rejectLoan(loanObj));
});
  
app.get("/", sayHi);

app.listen(5000, () => {
  console.log(`Server is running on port 5000.`);
});