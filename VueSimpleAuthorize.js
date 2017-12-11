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
 *
 */

import _ from 'lodash'

//Quando avremo tutto dentro a webpack con il polyfill per es6 faremo una bella cosa
class VueSimpleAuthorize {
  constructor(cfgs = {}) {
    this.authorizations = cfgs.authorizations || {};
  }

  subject_auth(subject) {
    if (_.includes(Object.keys(this.authorizations), subject)) {
      return this.authorizations[subject];
    } else {
      return this.authorizations['*'] || {};
    }
  }


  authorize(subject, action) {
    action_auth = this.subject_auth(subject);

    if (_.includes(Object.keys(action_auth), action)) {
      return action_auth[action];
    } else {
      return action_auth['*'] || new Promise((ris) => ris(false));
    }
  }

  install(Vue, options) {
    this.authorizations = options.authorizations || {};

    console.log(options);
    const self = this;

    Vue.directive('authorize', function (el, binding) {
      console.log(self)
      let autorizzazioni = [];
      const chiavi = Object.keys(binding.modifiers);
      for (let v in chiavi) {
        autorizzazioni.push(self.authorize(binding.arg, chiavi[v])(binding.value));
      }

      el.style.display = 'none';
      Promise.all(autorizzazioni).then(function (valori) {
        let count = 0;
        for (let v in valori) {
          if (valori[v]) {
            count++;
          }
        }
        if (count == valori.length) {
          el.style.display = 'block';
        }
      });

    });

    //Return a Promise
    Vue.prototype.$authorize = function (subject, action, value) {
      return self.authorize(subject, action)(value);
    };

  }

}

export default VueSimpleAuthorize;
