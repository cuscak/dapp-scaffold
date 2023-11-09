// TODO: SignMessage
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
const QUESTION_STATS_SEED = "QUESTION_STATS_SEED";


export const WisdomOfTheCrowd: FC = () => {
    const [question, setQuestion] = useState("");
    const [treshold, setTreshold] = useState(0);

    const [questionAccounts, setQuestionAccounts] = useState([]);

    const userWallet = useWallet();
    const { connection } = useConnection();

    const getProvider = () => {
        const provider = new AnchorProvider(connection, userWallet, AnchorProvider.defaultOptions());
        return provider;
    }

    const createQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    utils.bytes.utf8.encode(QUESTION_STATS_SEED),
                    questionPDA.toBuffer(),
                ],
                program.programId
            );


            const transaction = await program.methods
                .initialize(question, treshold)
                .accounts({
                    questionAcc: questionPDA,
                    questionStatsAcc: questionStatsPDA,
                    user: anchProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            console.log("Transaction", transaction);
            console.log("Question created successfully", questionPDA.toString());
            console.log("Question Stats created successfully", questionStatsPDA.toString());


        } catch (error) {
            console.log("Error creating question", error);
        }

        setQuestion('');
    }

    const listQuestions = async (e: React.FormEvent) => {
        e.preventDefault();

        const anchProvider = getProvider();
        const program = new Program(idl_object, programID, anchProvider);

        try {
            // Fetch all accounts associated with the program
            const accounts = await connection.getProgramAccounts(programID);
            // Deserialize each account's data
            const accountDetails = await Promise.all(accounts.map(async (accountInfo) => {
                try {
                    // Attempt to fetch the account as a Question type.
                    const data = await program.account.question.fetch(accountInfo.pubkey);
                    return {
                        type: 'Question',
                        data,
                        pubkey: accountInfo.pubkey.toBase58(),
                    };
                } catch (err) {
                    // If it fails, it might be a QuestionStats type.
                    try {
                        const data = await program.account.questionStats.fetch(accountInfo.pubkey);
                        return {
                            type: 'QuestionStats',
                            data,
                            pubkey: accountInfo.pubkey.toBase58(),
                        };
                    } catch (error) {
                        // If it's neither, log an error or handle it as needed.
                        console.error('Unknown account type or failed to fetch account data.', error);
                        return null;
                    }
                }
            }));

            console.log(accountDetails);
            setQuestionAccounts(accountDetails);

        } catch (error) {
            console.log("Error listing question", error);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <form onSubmit={createQuestion} className="w-full max-w-sm">
                <div className="flex flex-col items-center border-b border-teal-500 py-2">
                    <input
                        className="appearance-none bg-transparent border-none w-full text-gray-700 mb-3 py-1 px-2 leading-tight focus:outline-none"
                        type="text"
                        placeholder="Type your question here..."
                        aria-label="Question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        required // Makes sure the form can't be submitted if the input is empty
                    />
                    <input
                        className="appearance-none bg-transparent border-none w-full text-gray-700 mb-3 py-1 px-2 leading-tight focus:outline-none"
                        type="number"
                        placeholder="Enter treshold..."
                        aria-label="Treshold"
                        value={treshold > 0 ? treshold : ''} // To ensure the field is empty if treshold is 0
                        onChange={(e) => setTreshold(Math.max(0, parseInt(e.target.value, 10)))}
                        required // Makes sure the form can't be submitted if the input is empty
                    />
                    <button
                        type="submit"
                        className={`btn ${question.trim().length > 0 && treshold > 0 ? 'animate-pulse' : ''} bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black`}
                        disabled={!userWallet.publicKey || question.trim().length === 0 || treshold <= 0}
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

            <button
                onClick={listQuestions}
                className="btn bg-gradient-to-br from-green-500 to-blue-500 hover:from-white hover:to-green-300 text-black mt-4"
            >
                List Questions
            </button>

            {/* Display the list of questions */}
            <div>
                {questionAccounts.map((account, index) => {
                    if (account) {
                        if (account.type === 'Question') {
                            const questionText = new TextDecoder().decode(new Uint8Array(account.data.question));
                            const trimmedQuestionText = questionText.replace(/\0.*$/g,'');
                            return (
                                <div key={index}>
                                    <p>Question: {trimmedQuestionText}</p>
                                    <p>Author: {account.data.author.toBase58()}</p>
                                    <p>Threshold: {account.data.treshold}</p>
                                </div>
                            );
                        } else if (account.type === 'QuestionStats') {
                            return (
                                <div key={index}>
                                    <p>Question Stats: {account.data.questionAcc.toBase58()}</p>
                                    <p>Answers Count: {account.data.answersCount}</p>
                                    <p>Average: {account.data.average.toString()}</p>
                                </div>
                            );
                        }
                    }
                    return null; // In case account is null or undefined
                })}
            </div>
        </div>
    );

};
