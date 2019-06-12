const mongoose = require('mongoose');

let deviceSchema = mongoose.Schema({
    // owner of the device
    userEmail: {
        type: mongoose.Schema.Types.String,
        required: true
    },
    // latest device registration token
    registrationToken: {
        type: mongoose.Schema.Types.String,
        required: true
    }
    
});


module.exports = mongoose.model('Device', deviceSchema);