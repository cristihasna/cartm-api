const mongoose = require('mongoose');

let debtSchema = mongoose.Schema({
    // session associated with the debt
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    // the participant being owned
    owedTo: {
        type: String,
        match: /[A-Za-z][a-zA-Z0-9._]+\@[A-Za-z](\.?[a-zA-Z0-9._]+)+/,
        required: true
    },
    // the participant that owes
    owedBy: {
        type: String,
        match: /[A-Za-z][a-zA-Z0-9._]+\@[A-Za-z](\.?[a-zA-Z0-9._]+)+/,
        required: true
    },
    // amount being owned
    amount: {
        type: Number,
        min: 0
    },
    // deadline for the debt
    deadline: {
        type: Date,
        required: false,
        default: null
    },
    // date of payment (null if payment not already done)
    payed: {
        type: Date,
        required: false,
        default: null
    }
});


module.exports = mongoose.model('Debt', debtSchema);