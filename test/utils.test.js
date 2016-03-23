/* global describe, it */

'use strict'
var assert = require('assert') // eslint-disable-line
var should = require('should') // eslint-disable-line
var utils = require('../lib/utils.js')
var shadowcatutils = require('../lib/utils_shadowcat.js')

describe('utils lib/utils.js', function () {
  it('return a range given min/max/count', function () {
    var r = utils.returnDistributedArray(20923044, 10000002, 8)

    r.length.should.equal(8)
    r[0].start.should.equal(10000002)
    r[7].end.should.equal(20923044)
  })
})

describe('utils_shadowcat lib/utils_shadowcat.js', function () {
  it('Create a new agent when there is VIAF data and no existing agent data', function () {
    var plato = { nameLocal: 'Plato.',
      relator: false,
      type: 'personal',
      contributor: false,
      nameLc: 'Plato',
      nameViaf: 'Plato',
      viaf: { _id: '108159964',
        viaf: [ '108159964',
          '299190368',
          '306339535',
          '261509958',
          '85932949',
          '257631224',
          '262857497',
          '288392106',
          '104723617',
          '85932965',
          '59087945',
          '79033290',
          '250661051',
          '104718382',
          '265620858',
          '305056294',
          '312737481',
          '264723928' ],
        sourceCount: 31,
        type: 'Personal',
        hasLc: true,
        hasDbn: true,
        lcId: 'n79139459',
        gettyId: '500248317',
        wikidataId: 'Q859',
        lcTerm: 'Plato LC TEST',
        dnbTerm: 'Plato v427-v347',
        viafTerm: 'Plato',
        birth: '-427-01-01',
        death: '-347',
        dbpediaId: 'Plato',
        normalized: [ 'plato', 'plato v427 v347' ],
      fast: [ 46610 ] },
      agent: false,
    source: 10000347 }

    var r = shadowcatutils.mergeScAgentViafRegistryAgent(plato)

    r.viaf.indexOf('288392106').should.above(-1)
    r.type.should.equal('personal')
    r.ulan.should.equal(500248317)
    r.death.should.equal('-347')
    r.fast[0].should.equal(46610)
    r.nameControlled.should.equal('Plato LC TEST')
  })
  it('Modify existing agent when there is new data', function () {
    var plato = {
      nameLocal: 'Coooooool Old Guy.',
      relator: false,
      type: 'personal',
      contributor: false,
      nameLc: 'Plato',
      nameViaf: 'Plato',
      viaf: { _id: '108159964',
        viaf: [ '108159964',
          '299190368',
          '306339535',
          '261509958',
          '85932949',
          '257631224',
          '262857497',
          '288392106',
          '104723617',
          '85932965',
          '59087945',
          '79033290',
          '250661051',
          '104718382',
          '265620858',
          '305056294',
          '312737481',
          '264723928' ],
        sourceCount: 31,
        type: 'Personal',
        hasLc: true,
        hasDbn: true,
        lcId: 'n79139459',
        gettyId: '500248317',
        wikidataId: 'Q859',
        lcTerm: 'Plato',
        dnbTerm: 'Plato v427-v347',
        viafTerm: 'Plato',
        birth: '-427-01-01',
        death: '-347',
        dbpediaId: 'Plato',
        normalized: [ 'plato', 'plato v427 v347' ],
      fast: [ 46610 ] },
      agent: {
        _id: '56f2f1b48cdb6d29a8479f28',
        viaf: [ '108159964',
          '299190368',
          '306339535',
          '261509958',
          '85932949',
          '257631224',
          '262857497',
          '288392106',
          '104723617',
          '85932965',
          '59087945',
          '79033290',
          '250661051',
          '104718382',
          '265620858',
          '305056294',
          '312737481',
          '264723928' ],
        registry: 'temp14587623531268919041',
        nameControlled: 'Plato',
        wikidata: 'Q859',
        lcId: 'n79139459',
        ulan: 500248317,
        dbpedia: false,
        birth: '-427-01-01',
        death: '-347',
        type: 'personal',
        source: false,
        useCount: 0,
        altForms: [],
        nameNormalized: [ 'plato' ],
        fast: [ 46610 ]
      },
      source: 10000347
    }

    var r = shadowcatutils.mergeScAgentViafRegistryAgent(plato)
    r.nameNormalized.indexOf('coooooool old guy').should.above(-1)
  })
})
