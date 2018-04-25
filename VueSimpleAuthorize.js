/**
 * Plugin che ha l'intento di inserire della logica authorizzativa nei componenti
 * dell'applicazione vue, si occupa solamente di inibire determinati componenti
 * rispetto al livello authorizzativo inserito nell'applicazione. Di fatto tutto
 * viene comunque validato e authorizzato sucessivamente da pundit a livello di
 * server
 *
 * Installazione:
 *   var auths = new PunditAuthorize(
 *      {
 *          authorizations: {
 *              soggetto:{
 *                  "azione?":function(value){
 *                      return new Promise(function(success){
 *                          success(true|false);
 *                      })
 *                  }
 *              }
 *          }
 *      }
 *   );
 *
 *   Vue.use(auths);
 *
 *   la struttura dell'authorization deve essere composta da elementi che
 *   restituiscono funzioni con promise, in modo che i componenti potrebbero essere
 *   autorizzati anche in modo asincrono, il plugin mette sempre tutto inizialmente
 *   come non authorizzato nascondendo il componente
 *
 * Utilizzo:
 * In qualsiasi elemento del template si può utilizzare
 * v-authorize:soggetto.azione?.azione2?="valore di passaggio"
 *
 * dove :
 *  soggetto è il namespace dell'athorizzation
 *  azione? è una funzione nel namespace
 *  valore di passaggio è un valore da utilizzare nella richiesta dei permessi
 *
 * oppure direttamente come componente:
 *
 * <authorize :authorizations="['soggetto.azione?.azione2?',valore di passaggio]">
 *   qualsiasi cosa verrà renderizzata nel caso si è autorizzati
 * </authorize>
 *
 * come per il precedente si può passare il soggetto dell'azione e il valore di passaggio
 *
 * inoltre è possibile passare anche il tag del componente che veramente si vuole
 * renderizzare, altrimenti viene usato il default[div]
 *
 *  cont_tag:  tag dell'elemento
 *
 */

import includes from 'lodash.includes'
import keys from 'lodash.keys'
import pick from 'lodash.pick'
import isObject from 'lodash.isobject'
import isUndefined from 'lodash.isundefined'

const md5 = require('md5');
const objectHash = require('object-hash');


//Quando avremo tutto dentro a webpack con il polyfill per es6 faremo una bella cosa
export default class VueSimpleAuthorize {
  constructor(cfgs = {}) {
    this.authorizations = cfgs.authorizations || {};
    this.cached_requests = {};
  }

  subject_auth(subject) {
    if (includes(keys(this.authorizations), subject)) {
      return this.authorizations[subject];
    } else {
      return this.authorizations['*'] || {};
    }
  }

  build_utorization_promise(subject_key, actions, object) {

    const self = this;

    return new Promise(function (s) {

      let autorizzazioni = [];
      let chiavi = actions;
      for (let v in chiavi) {
        autorizzazioni.push(
          new Promise(result => {
            //inside the cache system

            const key = md5(`${subject_key}_${chiavi[v]}_${object}`);

            if (self.get_cached_result(key) === null) {
              self.authorize(subject_key, chiavi[v])(object,
                {
                  subject: subject_key,
                  action: chiavi[v]
                }
              ).then(ris => {
                self.set_cached_result(key, ris);
                result(ris);
              })
            } else {
              result(self.get_cached_result(key));
            }


          })
        );
      }

      Promise.all(autorizzazioni).then(function (valori) {
        let count = 0;
        for (let v in valori) {
          if (valori[v]) {
            count++;
          }
        }
        s(count == valori.length);

      });

    });


  };

  authorize(subject, action) {
    const action_auth = this.subject_auth(subject);

    if (includes(keys(action_auth), action)) {
      return action_auth[action];
    } else {
      return action_auth['*'] || new Promise((ris) => ris(false));
    }
  }

  get_cached_result(key) {
    return this.cached_requests[key] || null;
  }

  set_cached_result(key, value) {
    this.cached_requests[key] = value;
  }

  install(Vue, options) {
    this.authorizations = options.authorizations || {};

    const self = this;

    Vue.directive('authorize', function (el, binding) {

      var chiavi = Object.keys(binding.modifiers);
      const old_style = el.style.display;
      el.style.display = 'none';
      self.build_utorization_promise(binding.arg, chiavi, binding.value).then(function (ris) {
        if (ris) {
          el.style.display = old_style;
        }
      });

    });

    Vue.component('authorize', {
      render: function (createElement) {

        let children = this.$slots.default;

        let refs = this.authorizations[0].split('.');
        let subject = refs[0];
        let actions = refs.slice(1);
        let object = this.authorizations[1];

        let key = subject + "_" + actions + "_" + (isObject(object) ? objectHash.sha1(pick(object, this.cache_keys)) : object);
        // Se non è autorizzato
        if (!this.is_authorized(key)) {
          children = [];
          // se non ho controllato l'autorizzazione

          if (!this.is_authorization_checked(key)) {
            let that = this;
            that.$set(that.authorization_checked, key, true);

            self.build_utorization_promise(subject, actions, object).then(function (ris) {
              that.$set(that.authorized, key, ris);
            });

          }
        }

        return createElement(
          this.cont_tag || 'div',   // tag name
          children // array of children
        )

      },
      props: {
        cont_tag: {
          type: String
        },
        authorizations: {
          type: Array
        },
        //Indetifica un array di chiavi da tener in considerazione per
        // generare la chiave di cache su una determinato oggetto
        cache_keys: {
          type: Array,
          default: function () {
            return ['id'];
          }
        }
      },
      data: function () {
        return {
          authorized: {},
          authorization_checked: {}
        }
      },
      methods: {
        is_authorized: function (key) {
          return !isUndefined(this.authorized[key]) && this.authorized[key];
        },
        is_authorization_checked: function (key) {
          return !isUndefined(this.authorization_checked[key]);
        }
      }
    });

    //Return a Promise
    Vue.prototype.$authorize = function (subject, action, value) {
      return self.authorize(subject, action)(value, {
        subject: subject,
        action: action
      });
    };

  }

}