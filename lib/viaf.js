'use strict'
var request = require('request')
var async = require('async')

/**
* Given a possivle VIAF id it will use the API to get back any redirects (to new viaf)
*
* @param  {string} viaf - The VIAF id to lookup
* @param  {function} cb - callback
*/
exports.returnAllViafData = (viaf, cb) => {
  async.parallel({
    // see if the culster redirects to another cluster and return it if it does
    checkRedirect: (callback) => {
      var options = {
        url: 'http://viaf.org/viaf/' + viaf + '/',
        followRedirect: false
      }
      request(options, (error, response, body) => {
        if (error) console.log(error)
        if (response && response.statusCode === 301 && response.headers && response.headers.location) {
          var viafId = response.headers.location
          viafId = viafId.split('/viaf/')[1]
          if (viafId) {
            if (!isNaN(viafId)) {
              callback(error, viafId)
              return true
            }
          }
        }
        // if it got here then it did not work
        callback(error, false)
      })
    },
    // looks to see if there is a deletion note in the rdf comment
    checkForDeleted: (callback) => {
      var options = {
        url: 'http://viaf.org/viaf/' + viaf + '/rdf.xml'
      }
      request(options, (error, response, body) => {
        if (error) console.log(error)
        if (response && response.statusCode === 200) {
          if (body.search("This VIAF URI has been 'deleted'") > -1) {
            callback(error, true)
            return true
          }
        }
        // if it got here then it did not work
        callback(error, false)
      })
    },
    // return the LC NAF ID if it can find it in a simple regex search
    checkForLc: (callback) => {
      var options = {
        url: 'http://viaf.org/viaf/' + viaf + '/viaf.xml'
      }
      request(options, (error, response, body) => {
        if (error) console.log(error)
        if (response && response.statusCode === 200) {
          var r = body.match(/\>LC\|.*?[0-9]+\</)
          if (r) {
            r = r[0].replace(/\>LC\|/, '').replace(/\</, '').replace(/\s+/, '')
            callback(error, r)
            return true
          }
        }
        // if it got here then it did not work
        callback(error, false)
      })
    }
  }, (err, results) => {
    if (err) console.log(err)
    if (cb) cb(err, results)
  })
}

/**
* Given a LCNAF Id it should check to see if there is a mads:useInstead triple pointing to the correct NAF id and then try to translate it to VIAF
*
* @param  {string} lcId - The LC id to lookup (n85367769/no85367769/etc)
* @param  {function} cb - callback
*/
exports.returnLcUseInstead = (lcNafId, cb) => {
  var options = {
    url: `http://id.loc.gov/authorities/names/${lcNafId}.madsrdf.nt`,
    headers: {
      'User-Agent': 'wget'
    }
  }
  request(options, (error, response, body) => {
    if (error) console.log(error)
    if (response && response.statusCode === 200) {
      var triples = body.split('\n').filter((t) => (t.search('http://www.loc.gov/mads/rdf/v1#useInstead') > -1))
      if (triples[0]) {
        // matching on this: http://id.loc.gov/authorities/names/n2016003886>
        var newNaf = triples[0].split('> <')
        newNaf = (newNaf && newNaf[2]) ? newNaf[2].match(/\/names\/(.*?)\>/) : false
        newNaf = (newNaf && newNaf[1]) ? newNaf[1] : false
        if (newNaf) {
          // now that we have the naf ask viaf if they have it
          var options = {
            url: `http://viaf.org/viaf/lccn/${newNaf}`,
            followRedirect: false
          }
          request(options, (error, response, body) => {
            if (error) console.log(error)
            if (response && response.statusCode === 301 && response.headers && response.headers.location) {
              var viafId = response.headers.location
              viafId = viafId.split('/viaf/')[1]
              if (viafId) {
                if (!isNaN(viafId)) {
                  cb(error, viafId)
                  return true
                }
              }
            } else {
              cb(error, false)
            }
          })
          // dont hit the cb below we will cb from this request
          return true
        }
      }
    }
    // if it got here something did not work
    cb(error, false)
  })
}
