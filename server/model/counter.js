const mongoose=require('mongoose')
 const counterSchema=new mongoose.Schema({
    sequence_id:String,
    sequence_value:Number
 });

const counter=mongoose.model('counter',counterSchema);
module.exports=counter;