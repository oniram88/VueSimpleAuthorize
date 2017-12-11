**VueSimpleAuthorize**

***Intallation***

yarn add VueSimpleAuthorize

In your app

    import SimpleAuthorize from 'VueSimpleAuthorize';

    const auth={
      'subject':{
        'action?':(value,options)=>{
          return new Promise(function (callback_result) {
    
            //anything you want to do with value and then respond
            //with callback_result
            
            callback_result(true|false);
            
    
          });
        }
      }
    
    }


    Vue.use(new SimpleAuthorize, {authorizations: auth});
    
Then in your components you can use:

    <a v-authorize:subject.action?="value">Hello world</a>
    
Or you can make multiple authorizations in one time, only if all pass then the element is visible:
  
    <a v-authorize:subject.action?.action2?.action3?="value">Hello world</a>   
    
In the authorization method you will receive a options object containing:

    {
      subject:'my_super_subject',
      action:'my_secret_action'
    }    

   
Or you can make a request direct from code using the this.$authorize method 
inside your components:

    this.$authorize(subject, action, value).then(ris=>{
      if(ris){
        console.log('authorized);
      }else{
        console.log('NOT authorized);
      }
    
    })   
   
If you want to make a wildcard for subject or action you can perform with *:

      
    const auth={
      'subject':{
        'action?':(value,options)=>{
          return new Promise((callback_result)=>{
    
            //anything you want to do with value and then respond
            //with callback_result
            
            callback_result(true|false);
            
    
          });
        },
        '*':(value,options)=>{
          return new Promise((callback_result)=>{
            callback_result(false);
          });
        }
      },
      '*':{
        '*':(value,options)=>{
          return new Promise((callback_result)=>{
            callback_result(false);
          });
        }
      }
    
    }        