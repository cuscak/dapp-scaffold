// TODO: SignMessage
import { verify } from '@noble/ed25519';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import idl from "../../../../target/idl/wisdom_of_the_crowd.json";
import { PublicKey } from '@solana/web3.js';

import crypto from 'crypto';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

const QUESTION_SEED = "QUESTION_SEED";


export const WisdomOfTheCrowd: FC = () => {
    const [question, setQuestion] = useState("");

    const userWallet = useWallet();
    const { connection } = useConnection();

    const getProvider = () => {
        const provider = new AnchorProvider(connection, userWallet, AnchorProvider.defaultOptions());
        return provider;
    }

    const createQuestion = async () => {
        try {
            const anchProvider = getProvider();
            const program = new Program(idl_object, programID, anchProvider);

            const [questionPDA, questionBump] = await PublicKey.findProgramAddressSync(
                [
                    crypto.createHash('sha256').update(question).digest(),
                    utils.bytes.utf8.encode(QUESTION_SEED),
                    anchProvider.wallet.publicKey.toBuffer(),
                ],
                program.programId
            );

            const [questionStatsPDA, questionStatsBump] = await PublicKey.findProgramAddressSync(
                [
                    
                ],
                program.programId
            );
        } catch (error) {

        }

        setQuestion('');
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <form onSubmit={null} className="w-full max-w-sm">
                <div className="flex items-center border-b border-teal-500 py-2">
                    <input
                        className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
                        type="text"
                        placeholder="Type your question here..."
                        aria-label="Question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        required // This makes sure the form can't be submitted if the input is empty
                    />
                    <button
                        type="submit"
                        className={`btn ${question.trim().length > 0 ? 'animate-pulse' : ''} bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black`}
                        disabled={!userWallet.publicKey || question.trim().length === 0}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden">
                            Create Question
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
};
