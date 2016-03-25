/* global describe, it */

'use strict'
var assert = require('assert') // eslint-disable-line
var should = require('should') // eslint-disable-line
var viafUtils = require('../lib/viaf.js')

describe('utils lib/viafUtils.js', function () {
  this.timeout(30000)
  it('Should return the redirect VIAF when given a old merged VIAF cluster id', (done) => {
    viafUtils.returnAllViafData('264030008', (err, results) => {
      if (err) console.log(err)
      results.checkRedirect.should.equal('137799745')
      done()
    })
  })
  it('Should not return a new VIAF redirect when given a valid VIAF', (done) => {
    viafUtils.returnAllViafData('137799745', (err, results) => {
      if (err) console.log(err)
      results.checkRedirect.should.equal(false)
      done()
    })
  })
  it('It should report that a VIAF cluster is depreciated', (done) => {
    viafUtils.returnAllViafData('9431627', (err, results) => {
      if (err) console.log(err)
      results.checkForDeleted.should.equal(true)
      done()
    })
  })
  it('It should return the LCNAF id when found', (done) => {
    viafUtils.returnAllViafData('137799745', (err, results) => {
      if (err) console.log(err)
      results.checkForLc.should.equal('n87890313')
      done()
    })
  })
  it('it should return the VIAF ID based on the LCNAF mads:useInstead', (done) => {
    viafUtils.returnLcUseInstead('n85367769', (err, results) => {
      // console.log(results)
      if (err) console.log(err)
      results.should.equal('22324673')
      done()
    })
  })
  it('it should return false based on wrong VIAF ID to LCNAF mads:useInstead', (done) => {
    viafUtils.returnLcUseInstead('n853677695', (err, results) => {
      // console.log(results)
      if (err) console.log(err)
      results.should.equal(false)
      done()
    })
  })

  it('it should not be able to return VIAF because there is no mads:useInstead', (done) => {
    viafUtils.returnLcUseInstead('n2009018060', (err, results) => {
      // console.log(results)
      if (err) console.log(err)
      results.should.equal(false)
      done()
    })
  })
})
