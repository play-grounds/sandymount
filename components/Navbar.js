import { html, Component } from 'https://unpkg.com/htm/preact/standalone.module.js'

export class Navbar extends Component {
  constructor (props) {
    super(props)
    this.state = {
      loggedIn: localStorage.getItem('loggedIn') === 'true',
      pubkey: localStorage.getItem('nostr:pubkey') || localStorage.getItem('pubkey') || '',
      privkey: localStorage.getItem('nostr:privkey') || ''
    }
    // Check for privkey in URL hash after component mounts
    this.checkPrivkeyInHash()
  }

  checkPrivkeyInHash = () => {
    const hash = window.location.hash
    const match = hash.match(/#k=([a-fA-F0-9]{64})/)
    if (match) {
      const privkey = match[1]
      this.loginWithPrivkey(privkey)
      console.log('privkey', privkey)
      // Remove the hash from the URL
      history.pushState("", document.title, window.location.pathname + window.location.search)
    }
  }

  login = async () => {
    const { value: loginMethod } = await Swal.fire({
      title: 'Login',
      html: `
        <button id="extensionLogin" class="swal2-confirm swal2-styled" style="display:block; width:100%; margin:10px auto;">Sign in with  extension</button>
        <input id="privkeyInput" type="text" placeholder="Or enter your 64-character hex private key" class="swal2-input" style="display:block; width:100%; margin:10px auto;">
        <p style="margin-top: 10px; font-size: 0.9em;"><a href="https://nostrapps.github.io/extensions/" target="_blank">What is an extension?</a></p>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      focusConfirm: false,
      didOpen: () => {
        const extensionButton =
          Swal.getPopup().querySelector('#extensionLogin')
        const privkeyInput =
          Swal.getPopup().querySelector('#privkeyInput')

        // Focus on the private key input
        privkeyInput.focus()

        extensionButton.addEventListener('click', () => {
          Swal.clickConfirm()
        })

        privkeyInput.addEventListener('keyup', e => {
          if (e.key === 'Enter') {
            Swal.clickConfirm()
          }
        })

        // Add paste event listener
        privkeyInput.addEventListener('paste', e => {
          setTimeout(() => {
            if (
              privkeyInput.value.length === 64 &&
              /^[0-9a-fA-F]+$/.test(privkeyInput.value)
            ) {
              Swal.clickConfirm()
            }
          }, 0)
        })
      },
      preConfirm: () => {
        const privkey =
          Swal.getPopup().querySelector('#privkeyInput').value
        if (
          privkey &&
          (privkey.length !== 64 || !/^[0-9a-fA-F]+$/.test(privkey))
        ) {
          Swal.showValidationMessage(
            'Invalid private key format. Please enter a 64-character hex string.'
          )
          return false
        }
        return {
          loginMethod: privkey ? 'privkey' : 'extension',
          privkey
        }
      }
    })

    if (loginMethod) {
      if (loginMethod.loginMethod === 'privkey') {
        this.loginWithPrivkey(loginMethod.privkey)
      } else {
        // Check for localStorage privkey first
        const storedPrivkey = localStorage.getItem('nostr:privkey')
        if (storedPrivkey) {
          this.loginWithPrivkey(storedPrivkey)
        } else {
          this.loginWithExtension()
        }
      }
    }
  }

  loginWithExtension = async () => {
    if (window.nostr) {
      try {
        const pubkey = await window.nostr.getPublicKey()
        this.setState({ loggedIn: true, pubkey }, () => {
          localStorage.setItem('loggedIn', 'true')
          localStorage.setItem('pubkey', pubkey)
          localStorage.setItem('nostr:pubkey', pubkey)
          Swal.fire({
            title: 'Logged in!',
            text: 'You have successfully logged in with your Nostr extension.',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false
          })
          this.props.onLogin(pubkey) // Call onLogin prop instead of loadFile
        })
      } catch (error) {
        console.error('Login failed:', error)
        Swal.fire({
          title: 'Login Failed',
          text: 'There was an error logging in with your Nostr extension.',
          icon: 'error',
          timer: 1000,
          showConfirmButton: false
        })
      }
    } else {
      Swal.fire({
        title: 'Extension Not Found',
        text: 'Nostr extension not found. Please install a Nostr browser extension.',
        icon: 'warning',
        timer: 1000,
        showConfirmButton: false
      })
    }
  }

  loginWithPrivkey = async privkey => {
    console.log('loginWithPrivkey', privkey)
    if (privkey) {
      try {
        const pubkey = secp256k1.utils.bytesToHex(
          secp256k1.schnorr.getPublicKey(privkey)
        )
        console.log('pubkey', pubkey)
        localStorage.setItem('loggedIn', 'true')
        localStorage.setItem('pubkey', pubkey)
        localStorage.setItem('nostr:pubkey', pubkey)
        localStorage.setItem('nostr:privkey', privkey)
        console.log('localStorage', localStorage)
        this.setState({ loggedIn: true, pubkey, privkey }, () => {
          Swal.fire({
            title: 'Logged in!',
            text: 'You have successfully logged in with your private key.',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false
          })
          this.props.onLogin(pubkey)
        })
      } catch (error) {
        console.error('Login failed:', error)
        Swal.fire({
          title: 'Login Failed',
          text: 'There was an error generating the public key from the provided private key.',
          icon: 'error',
          timer: 1000,
          showConfirmButton: false
        })
      }
    }
  }

  logout = () => {
    this.setState({ loggedIn: false, pubkey: '', privkey: '' })
    localStorage.setItem('loggedIn', 'false')
    localStorage.removeItem('pubkey')
    localStorage.removeItem('nostr:pubkey')
    localStorage.removeItem('nostr:privkey')

    // Clear the textarea
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.value = ''
    }

    Swal.fire({
      title: 'Logged out!',
      text: 'You have successfully logged out.',
      icon: 'success',
      timer: 1000,
      showConfirmButton: false
    })

    // Call the onLogout prop to update the parent component
    this.props.onLogout()
  }

  render () {
    const { loggedIn, pubkey } = this.state
    return html`
      <nav>
        <a href="./" class="home-link">Home</a>
        <button onClick=${loggedIn ? this.logout : this.login}>
          ${loggedIn ? `Logout (${pubkey.slice(0, 8)})` : 'Login'}
        </button>
      </nav>
    `
  }
}
