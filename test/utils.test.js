/* global describe, it */

'use strict'
var assert = require('assert') // eslint-disable-line
var should = require('should') // eslint-disable-line
var utils = require('../lib/utils.js')
var shadowcatUtils = require('../lib/utils_shadowcat.js')
var archivesUtils = require('../lib/utils_archives.js')
var mmsUtils = require('../lib/utils_mms.js')
var tmsUtils = require('../lib/utils_tms.js')

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

    var r = shadowcatUtils.mergeScAgentViafRegistryAgent(plato)

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

    var r = shadowcatUtils.mergeScAgentViafRegistryAgent(plato)
    r.nameNormalized.indexOf('coooooool old guy').should.above(-1)
  })
})

describe('utils_archives lib/utils_archives.js', function () {
  it('Create a new agent when there is VIAF data and no existing agent data', function () {
    var data = {
      'id': 6287,
      'namePart': 'Andrews, Ann, 1890-1986',
      'type': 'persname',
      'authority': 'naf',
      'role': 'originator',
      'valueURI': 'http://viaf.org/viaf/53706985',
      'viaf': {
        '_id': '53706985',
        'viaf': [
          '53706985'
        ],
        'sourceCount': 1,
        'type': 'Personal',
        'hasLc': true,
        'hasDbn': true,
        'lcId': 'no89014249',
        'gettyId': false,
        'wikidataId': false,
        'lcTerm': 'Andrews, Ann, 1890-1986',
        'dnbTerm': false,
        'viafTerm': 'Andrews, Ann, 1890-1986',
        'birth': '1890-10-13',
        'death': '1986-01-23',
        'dbpediaId': false,
        'normalized': [
          'andrews ann 1890 1986'
        ],
        'fast': [
          1492506,
          1727006
        ]
      },
      'viafOg': '53706985',
      'agent': false
    }

    var r = archivesUtils.buildAgentFromArchiveAgent(data)
    r.viaf.indexOf('53706985').should.above(-1)
    r.type.should.equal('personal')
    r.lcId.should.equal('no89014249')
    r.death.should.equal('1986-01-23')
    r.fast[0].should.equal(1492506)
    r.nameControlled.should.equal('Andrews, Ann, 1890-1986')
  })
  it('Create a new agent when there is no VIAF data and no existing agent data', function () {
    var data = {
      'id': 4259,
      'namePart': 'New York (N.Y.). City Planning Commision',
      'type': 'corpname',
      'authority': false,
      'role': 'contributor',
      'valueURI': false,
      'viaf': false,
      'viafOg': false,
      'agent': false
    }

    var r = archivesUtils.buildAgentFromArchiveAgent(data)
    r.viaf.search('noViaf').should.above(-1)
    r.type.should.equal('corpname')
    r.lcId.should.equal(false)
    r.death.should.equal(false)
    r.fast.length.should.equal(0)
    r.nameControlled.should.equal('New York (N.Y.). City Planning Commision')
  })
})

describe('utils_mms lib/utils_mms.js', function () {
  it('Create a new agent when there is VIAF data and no existing agent data', function () {
    var data = {
      'namePart': 'Zawidzka-Manteuffel, Wanda, 1906-1994',
      'type': 'personal',
      'authority': 'naf',
      'valueURI': 'http://id.loc.gov/authorities/names/n95078597',
      'usage': false,
      'role': [
        'http://id.loc.gov/vocabulary/relators/ill'
      ],
      'viaf': {
        '_id': '9096637',
        'viaf': [
          '9096637'
        ],
        'sourceCount': 7,
        'type': 'Personal',
        'hasLc': true,
        'hasDbn': true,
        'lcId': 'n95078597',
        'gettyId': false,
        'wikidataId': 'Q7967152',
        'lcTerm': 'Zawidzka-Manteuffel, Wanda, 1906-1994',
        'dnbTerm': 'Zawidzka-Manteuffel, Wanda, 1906-1994',
        'viafTerm': 'Zawidzka, Wanda, 1906-1994',
        'birth': '1906-02-07',
        'death': '1994-05-04',
        'dbpediaId': 'Wanda_Zawidzka-Manteuffel',
        'normalized': [
          'zawidzka manteuffel wanda 1906 1994',
          'zawidzka wanda 1906 1994'
        ],
        'fast': [
          359929
        ]
      },
      'viafOg': '9096637',
      'lcId': 'n95078597',
      'agent': false,
      'source': {
        'source': 'mmsCollections',
        'id': 27418
      }
    }

    var r = mmsUtils.buildAgentFromMmsAgent(data)
    r.viaf.indexOf('9096637').should.above(-1)
    r.type.should.equal('personal')
    r.lcId.should.equal('n95078597')
    r.death.should.equal('1994-05-04')
    r.fast[0].should.equal(359929)
    r.nameControlled.should.equal('Zawidzka-Manteuffel, Wanda, 1906-1994')
  })
  it('Create a new agent when there is no VIAF data and no existing agent data', function () {
    var data = {
      'namePart': 'Katsukawa, Shunchô (fl. 1783-1821)',
      'type': 'personal',
      'authority': 'naf',
      'valueURI': false,
      'usage': 'primary',
      'role': [
        'http://id.loc.gov/vocabulary/relators/art'
      ],
      'viaf': false,
      'viafOg': false,
      'lcId': false,
      'agent': false,
      'source': {
        'source': 'mmsCollections',
        'id': 27391
      }
    }

    var r = archivesUtils.buildAgentFromArchiveAgent(data)
    r.viaf.search('noViaf').should.above(-1)
    r.type.should.equal('personal')
    r.lcId.should.equal(false)
    r.death.should.equal(false)
    r.fast.length.should.equal(0)
    r.nameControlled.should.equal('Katsukawa, Shunchô (fl. 1783-1821)')
  })
})

describe('utils_tms lib/utils_tms.js', function () {
  it('Create a new agent when there is VIAF data and no existing agent data', function () {
    var data = { id: 1700,
      nameAlpha: 'Wehrli, A. G.',
      nameLast: 'Wehrli',
      nameFirst: 'A. G.',
      nameDisplay: 'A. G. Wehrli',
      dateStart: 1900,
      dateEnd: 1919,
      nationality: 'Swiss',
      role: 'photographer',
      picid: '29570',
      ulan: '500066483',
      viaf: { _id: '96139673',
        viaf: [ '96139673' ],
        sourceCount: 1,
        type: 'Personal',
        hasLc: false,
        hasDbn: false,
        lcId: false,
        gettyId: '500066483',
        wikidataId: false,
        lcTerm: false,
        dnbTerm: false,
        viafTerm: 'Wehrli, A. G. (Swiss photographer, active early 20th century)',
        birth: '1870',
        death: '1960',
        dbpediaId: false,
      normalized: [ 'wehrli a g swiss photographer active early 20th century' ] },
      checkNames: [ 'Wehrli, A. G., 1900-1919',
        'Wehrli, A. G., 1900-',
        'Wehrli, A. G.',
        'A. G. Wehrli' ],
      viafOg: '96139673',
      agent: false,
    source: { source: 'tmsObjects', id: 95 } }

    var r = tmsUtils.buildAgentFromTmsAgent(data)
    r.viaf.indexOf('96139673').should.above(-1)
    r.type.should.equal('personal')
    r.lcId.should.equal(false)
    r.death.should.equal('1960')
    r.nameControlled.should.equal('Wehrli, A. G. (Swiss photographer, active early 20th century)')
  })
  it('Create a new agent when there is no VIAF data and no existing agent data', function () {
    var data = { id: 13485,
      nameAlpha: 'Lincoln, Abraham President',
      nameLast: 'Lincoln',
      nameFirst: 'Abraham',
      nameDisplay: 'President Abraham Lincoln',
      dateStart: 1809,
      dateEnd: 1865,
      nationality: 'American',
      role: 'subject',
      checkNames: [ 'Lincoln, Abraham President, 1809-1865',
        'Lincoln, Abraham President, 1809-',
        'Lincoln, Abraham President',
        'President Abraham Lincoln' ],
      viafOg: false,
      viaf: false,
      agent: false,
    source: { source: 'tmsObjects', id: 611 } }

    var r = tmsUtils.buildAgentFromTmsAgent(data)
    r.viaf.search('noViaf').should.above(-1)
    r.type.should.equal('personal')
    r.lcId.should.equal(false)
    r.death.should.equal(1865)
    r.fast.length.should.equal(0)
    r.nameControlled.should.equal('Lincoln, Abraham President, 1809-1865')
  })
})
