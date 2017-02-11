** Gulp JSON Translator
===================

> An easy way to translate json strings from one language to another.

## Why

If you've dealt with internationalization in the front end before you know that waiting to get translations can result
in many problems. Use this tool in order to get rough approximations of how verbose languages or very foreign characters
look within your app's components. Also for those on a budget, this gives you some level of  internationalization
without having to pay anyone.

## Requirements

You will need to register with Microsoft for a free Azure account and add the translator text api to your account in
order to get your free clientId and secret which are needed to access the api.
`https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/`

## Notes

Despite the name, this could be used without gulp. The initial intention was to use gulp streams to accomplish the
translations but I never got around to it. If you have time and want to put up a PR I gladly welcome it. Please note
that the microsoft API will be changing soon so I will likely transition this tool to use the Yandex API:
`https://tech.yandex.com/translate/`

Please also note that the module allows for name spacing, but must not have sub name spaces.

This module was originally built to be used with angular-translate, and works seamlessly with it.

## Example Usage

```json
{
    "sentence": "This is a sentence",
    "namespace": {
        "sentenceTwo": "This is a name spaced sentence"
    }
}
```

```javascript

var translateJson = require('gulp-json-translate');

var configuration = {
  // Can accept any number of client accounts and will choose
  // one at random for each translation.
  clientIds: [
    {
      clientId: 'clientId1',
      secret: 'clientSecret1'
    },
    {
      id: 'clientId2',
      secret: 'clientSecret2'
    },
    {
      id: 'clientId2',
      secret: 'clientSecret2'
    }
  ],
  // This will determine the languages that the source file get translated to.
  locales: [
      {
        langCode: 'ar_EG',
        lang: 'ar'
      },
      {
        langCode: 'de_DE',
        lang: 'de'
      }
  ],
  masterLanguage: 'en',
  src: '/app/languages/strings.json',
  dest: '/app/languages/languages/'
};

translateJson(configuration);

```

This will result in two files:
`/app/languages/language-ar_AG` containing:

```json
{
    "sentence": "وهذا حكم",
    "namespace": {
        "sentenceTwo": "وهذا حكم باسم متباعدة"
    }
}
```
and

`/app/languages/language-de_DE` containing:

```json
{
    "sentence": "Dies ist ein Satz",
    "namespace": {
        "sentenceTwo": "Dies ist ein Name Abstand Satz"
    }
}
```