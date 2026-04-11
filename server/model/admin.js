const mongoose=require('mongoose');
const adminshcema=new mongoose.Schema({
        teacher_id:String ,
        student_id:String,
        student_password:String,
        teacher_password:String
})

const admin =mongoose.model('admins',adminshcema);

module.exports=admin;
