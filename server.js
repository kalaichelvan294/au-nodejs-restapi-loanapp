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

const appendDataUnApprovedLoan = async (tableName, data) => {
    return new Promise( async (resolve, reject) => {
        const db = await getDbConnection();
        const res = await db.query("INSERT INTO `approvedloans`(`loanId`,`loanCategory`, `loanDurationMonth`, `loanInterest`, `loanAmount`, `proofName`, `proofId`, `cibilScore`, `userId`, `dateOfApply`, `status`) VALUES"
            +"('"+data.loanId+"','"+data.loanCategory+"',"+data.loanDurationMonth+","+data.loanInterest+","+data.loanAmount+",'"+data.proofName+"','"+data.proofId+"','"+data.cibilScore+"','"+data.userId+"','"+data.dateOfApply+"','"+data.status+"')");
        await db.end();
        resolve(true);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve(false);
    });
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
        // console.log("dbcon",db);
        const user = await db.query("SELECT * FROM user where userId='" + data.userId + "' and password='" + data.password + "'");
        await db.end();
        var res = getValidResponseFormat(user);
        // console.log("final res",res[0]);
        (res[0] === undefined) ? resolve({ "role": "invalid" }) : resolve(res[0]);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve({ "role": "invalid" });
    });
}

const getApprovedLoansByUser = async (query, data) => {
    return new Promise( async (resolve, reject) => {
        const db = await getDbConnection();
        const user = await db.query("SELECT * FROM approvedloans where approvedFlag='Y' and userId='" + data.userId + "'");
        await db.end();
        var res = getValidResponseFormat(user);
        // console.log("final res",res);
        resolve(res);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve([]);
    });
}

const getAllLoansHistory = async (query, data) => {
    return new Promise( async (resolve, reject) => {
        const db = await getDbConnection();
        const user = await db.query("SELECT * FROM approvedloans where approvedBy='" + data.userId + "'");
        await db.end();
        var res = getValidResponseFormat(user);
        resolve(res);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve([]);
    });
}

const getUnApprovedLoansByUser = async (fileName, data) => {
    const query = (data['all'])?"SELECT * FROM approvedloans where approvedFlag='N' and status!='Rejected'":"SELECT * FROM approvedloans where userId='" + data.userId + "' and approvedFlag='N'";
    return new Promise( async (resolve, reject) => {
        const db = await getDbConnection();
        const user = await db.query(query);
        await db.end();
        var res = getValidResponseFormat(user);
        // console.log("final res",res);
        resolve(res);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve([]);
    });
}

const approveLoan = async (data) => {
    return new Promise( async (resolve, reject) => {
        var db = await getDbConnection();
        var approved = "Approved";
        const res1 = await db.query("update approvedloans set status='"+approved+"',approvedFlag='"+"Y"+"',dateOfApproval='"+data.dateOfApproval+"',pendingAmount="+data.pendingAmount+",pendingDuration="+data.pendingDuration+",approvedBy='"+data.approvedBy+"' where loanId='"+data.loanId+"'");
        await db.end();
        // console.log("final res",res);
        resolve(true);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve(false);
    });
}


var rejectLoan = function(data){
    return new Promise( async (resolve, reject) => {
        var db = await getDbConnection();
        const res1 = await db.query("update approvedloans set status='Rejected',approvedBy='"+data.approvedBy+"' where loanId='"+data.loanId+"'");
        await db.end();
        // console.log("final res",res);
        resolve(true);
    }).catch((resolve)=>{
        console.log("promise error");
        resolve(false);
    });
}


const sayHi = (req, res) => {
    res.send("Hi!");
};

app.post("/applyLoan", (req, res) => {
    const loanObject = req.body;
    console.log("Apply Loan:",loanObject);
    appendDataUnApprovedLoan(unApprovedLoans, loanObject).then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send("error occured");
    });
    // res.send(`Loan Object saved`);
});

app.post("/authUser",(req, res) =>{
    const userobj = req.body;
    console.log("authUser:",userobj);
    
    var promise = getUser(userobj);
    promise.then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send({"role":"invalid"});
    });
    
    // res.send(authUser(users,userobj));
});

app.post("/getLoans",(req, res) =>{
    var userobj = req.body;
    console.log("getloans:",userobj);
    getApprovedLoansByUser(approvedLoans,userobj)
    .then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send([]);
    });
});

app.post("/getLoansAll",(req, res) =>{
    var userobj = req.body;
    console.log("getloansAll:",userobj);
    res.send(getApprovedLoansByUser(approvedLoans,userobj));
});

app.post("/getUnApprovedLoans",(req, res) =>{
    var userobj = req.body;
    console.log("getUnApprovedLoans:",userobj);
    getUnApprovedLoansByUser(unApprovedLoans,userobj)
    .then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send([]);
    });
});

app.get("/getAllUnApprovedLoans",(req, res) =>{
    console.log("getAllUnApprovedLoans");
    getUnApprovedLoansByUser(unApprovedLoans,{"all":"true"})
    .then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send([]);
    });
});

app.post("/getAllLoansHistory",(req, res) =>{
    var userobj = req.body;
    console.log("getAllLoansHistory:",userobj);
    getAllLoansHistory(unApprovedLoans,userobj)
    .then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send([]);
    });
});

app.post("/approveLoan",(req, res) =>{
    var loanObj = req.body;
    console.log("approving loan:",loanObj);
    approveLoan(loanObj)
    .then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send(false);
    });
});

app.post("/rejectLoan",(req, res) =>{
    var loanObj = req.body;
    console.log("rejecting loan:",loanObj);
    rejectLoan(loanObj)
    .then((resp)=>{
        res.send(resp);
    }).catch((err)=>{
        res.send(false);
    });
});
  
app.get("/", sayHi);

app.listen(5000, () => {
  console.log(`Server is running on port 5000.`);
});