config = require('./config')
encryption = require('./encryption');
utils = require('./utils');
security = require('./security');

var url = config(DB_CONFIG_FILE)
var CouchClient = require('couch-client');
var db = CouchClient(url);

exports.save_answer = function(req, res, question_id, answer_text, callback) {
  security.getCurrentUser(req, res, function(user){
    db.save({_id:utils.generateGuid(),
        type:"answer", 
        questionId: question_id, 
        userId: user._id,
        displayname: user.name, 
        answer: answer_text, 
        rank: 0,
        upvotes: new Array(),
        downvotes: new Array(),
        date:new Date()
        }, function(err, doc) {
          // TODO: error handling
          callback(doc);
        });
    })
}

exports.update_answer_count_for_question = function(questionId) {
  setTimeout(function() {
    db.view('/youngmindsdb/_design/questions/_view/by_answercount', { key: questionId, group: true }, function(err, doc) {
         if(!doc.rows || doc.rows.length == 0) return;

         db.save({
            _id: questionId + '_count',
            count: doc.rows[0].value
         }); 
      });
  }, 1000);
};

exports.get_user = function (email, callback) {
  db.view('/youngmindsdb/_design/users/_view/by_email', {key: email.toLowerCase()}, function(err, doc) {
      // Now you have the document(s) or error if there was trouble
      callback(err,doc)
  });
};

exports.get_question_answers = function(questionId, callback) {
    db.view('/youngmindsdb/_design/answers/_view/by_questionid', {key: questionId}, function(err, doc) {
      callback(err, doc)
  });
};

exports.get_popular_tags = function(callback) {
    db.view('/youngmindsdb/_design/tags/_view/by_popularity?group=true', function(err,doc){
      callback(err,doc);    
    });
};

exports.get_questions_by_tag = function(questionTag, callback) {
  var query = '/youngmindsdb/_design/questions/_view/by_tag';

  query += '?startkey=["' + encodeURIComponent(questionTag) + '",0]';
  query += '&endkey=["' + encodeURIComponent(questionTag) + '",999999999999999]';
  query += "&include_docs=true";

  console.log(query);

  db.view(query,  function(err, doc) {
      callback(err, doc)
  });
};
/*
youngmindsdb/_design/questions/_view/by_tag?startkey=[0,%22Depressed%22]&endkey=[9999999999999,%22Depressed%22]&include_docs=true
youngmindsdb/_design/questions/_view/by_tag?startkey=[0,"Depressed"]&endkey=[9999999999999,"Depressed"]&include_docs=true&descending=true
*/
exports.get_questions = function(callback) {
    db.view('/youngmindsdb/_design/questions/_view/by_tag', { include_docs: true, descending: true },  function(err, doc) {
      callback(err, doc)
  });
};

exports.get_questions_by_rank = function(callback){
  db.view('/youngmindsdb/_design/Answers/_view/by_rank',function(err,doc){
    callback(err, doc);  
  })
};

exports.get_all_users = function(callback){
  db.view('/youngmindsdb/_design/users/_view/getAllUsers',function(err,doc){
    callback(err, doc);  
  })
};
exports.create_session = function (id,email, callback) {
    var guid =  utils.generateGuid();
    db.save({session: guid, email: email.toLowerCase(), type: "session"}, function ( err, doc) {
      callback(guid);
    });
  }

exports.create_user = function (email,name, password) {
  encryption.hash(password, function(hash, salt){
    
    db.save({email: email.toLowerCase(), name:name, password: hash, type: "user", isElevated: false, salt:salt}, function ( err, doc) {
      // You know know if there was an error and have an updated version
      // of the document (with `_id` and `_rev`).
    });
  })
};
