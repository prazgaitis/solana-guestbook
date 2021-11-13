/*
 * We are going to be using the useEffect hook!
 */
import { useEffect, useState } from 'react';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import moment from 'moment';

import idl from './idl.json';
import kp from './keypair.json';
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);
console.log({ baseAccount })

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: "processed"
}

const App = () => {
  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const [comments, setComments] = useState([]);
  const [inputValue, setInputValue] = useState('')
  const [walletAddress, setWalletAddress] = useState(null);
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');

          const res = await solana.connect({ onlyIfTrusted: true });

          setWalletAddress(res.publicKey.toString());

          console.log('Connected with pubkey: ', res.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onInputChange = (e) => {
    const { value } = e.target;
    setInputValue(value);
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const sendComment = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    console.log('comment text:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      console.log(program.rpc);

      await program.rpc.addComment(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
        },
      });
      console.log("Comment sucesfully sent to program", inputValue)

      await getCommentList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    };
  }

  const notConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  )

  // const createAccount = async () => {
  //   try {
  //     const provider = getProvider();
  //     const program = new Program(idl, programID, provider);
  //     console.log("ping")
  //     await program.rpc.doSomething({
  //       accounts: {
  //         baseAccount: baseAccount.publicKey,
  //         user: provider.wallet.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       },
  //       signers: [baseAccount]
  //     });
  //     console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
  //     await getCommentList();

  //   } catch (error) {
  //     console.log("Error creating BaseAccount account:", error)
  //   }
  // }

  const CommentBox = ({ commentText, timestamp, userAddress }) => (
    <div className="gif-item" key={timestamp}>
      <div>
        <div className="line sub-sub-text">{commentText}</div>
        <span className="line muted">{moment(new Date(timestamp * 1000)).fromNow()}</span>
        <span className="line muted-darker"> // </span>
        <span className="line muted-darker">{userAddress.toString()}</span>
      </div>
    </div>
  )

  const connectedContainer = () => {
    return (
      <div>
        <div className="connected-container">
          {/* Go ahead and add this input and button to start */}
          <input
            type="text"
            placeholder="Leave a comment!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button onClick={sendComment} className="cta-button submit-gif-button">
            Submit
          </button>
        </div>
        <div className='lj-container'>
          {comments && comments.length > 0 && (
            <div className="gif-grid">
              {comments.slice(0).reverse().map(CommentBox)}
            </div>
          )}
        </div>
      </div>
    )
  }

  const getCommentList = async () => {
    try {
      const provider = await getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log('got the account', account);
      setComments(account.commentList)
    } catch (error) {
      console.log('and here we are')
      // await createAccount();
      console.error(error)
      setComments([]);
    }
  }
  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    window.addEventListener('load', async (event) => {
      await checkIfWalletIsConnected();
    });
  }, []);

  useEffect(() => {
    if (walletAddress) {
      getCommentList()
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">📘 Solana Guestbook</p>
          <p className="sub-sub-text">
            This is my On-Chain guestbook. Leave a comment below. It can be anything!
            A joke, a fun fact, or just a greeting. Every month,
            the contract will send one random commenter some SOL.
          </p>
          {!walletAddress && <p className="sub-text">
            Connect your wallet to see what everyone else wrote!
          </p>}

          {!walletAddress && notConnectedContainer()}
          {walletAddress && connectedContainer()}
        </div>
        <div className="footer-container"> </div>
      </div>
    </div>
  );
};

export default App;