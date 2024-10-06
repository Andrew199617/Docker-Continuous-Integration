
function waitUntil(callback, timeout = 1000) {
  function check(resolve) {
    return () => {
      if(callback()) {
        resolve()
      }
      else {
        setTimeout(check(resolve), timeout);
      }
    }
  }
  return new Promise(resolve => setTimeout(check(resolve), timeout));
}

module.exports = {
  waitUntil
}