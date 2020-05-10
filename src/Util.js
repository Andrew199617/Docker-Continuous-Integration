
function waitUntil(callback) {
  function check(resolve) {
    return () => {
      if(callback()) {
        resolve()
      }
      else {
        setTimeout(check(resolve), 1000);
      }
    }
  }
  return new Promise(resolve => setTimeout(check(resolve), 1000));
}

module.exports = {
  waitUntil
}