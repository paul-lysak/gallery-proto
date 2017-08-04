//TODO implement it

var app = new Vue({
  data: {
    message: 'Hello Vue!'
  },
    template: `
    <div class="container g-center-container">

      <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Sign In - Gallery</h3>
          </div>
          <div class="panel-body">
            <form>
              <div class="form-group">
                <input type="text" class="form-control" placeholder="Username">
                <input type="password" class="form-control" placeholder="Password">
             </div>
             <button type="submit" class="btn btn-default">Sign In</button>
          </div>
      </div>
     
      <div class="panel">
          <div class="panel-body">
          {{ message }}
          </div>
      </div> 

    </div>
    `
}).$mount("#app")

