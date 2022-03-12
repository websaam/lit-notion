import { useRouter } from "next/router";
import { useState, useEffect } from 'react';
import { NotionRenderer } from "react-notion-x";
import Script from 'next/script'
import getConfig from 'next/config'
const { publicRuntimeConfig } = getConfig()

import LitJsSdk from 'lit-js-sdk';

const litNodeClient = new LitJsSdk.LitNodeClient()
litNodeClient.connect()



const notionPage = () => {

    // -- prepare
    const router = useRouter()
    const { id } = router.query;

    // -- state
    // const [resourceId, setResourceId] = useState(null);
    // const [accessControlConditions, setAccessControlConditions] = useState(null);
    // const [authSig, setAuthSig] = useState(null);
    const [page, setPage] = useState(null);
    const [error, setError] = useState(null);
    const [humanised, setHumanised] = useState(null);

    // -- mounted
    useEffect(() => {

        // -- validate
        if( ! id ){
            return;
        }

        // -- method
        const run = async () => {
            const tempAlert = window.alert;
            window.alert = () => {};
            console.log(">> run");

            // -- prepare
            const chain = 'ethereum';
            const authSig = await LitJsSdk.checkAndSignAuthMessage({chain})
            const api = publicRuntimeConfig.BACKEND_API + '/notion/conditions/' + id;
            const res = await fetch(api);
            const data = await res.json();
            console.log("Fetched: ", data);

            const accessControlConditions = data.accessControlConditions;
            const resourceId = data.resourceId;
            const _humanised = await LitJsSdk.humanizeAccessControlConditions({accessControlConditions});
            setHumanised(_humanised);

            console.warn(">> getNotionPage");
            console.log(">> authSig:", authSig);
            console.log(">> chain:", chain);
            console.log(">> accessControlConditions:", accessControlConditions);
            console.log(">> resourceId:", resourceId);

            setTimeout(async () => {
                let jwt;

                try{
                    jwt = await litNodeClient.getSignedToken({ 
                        accessControlConditions, 
                        chain, 
                        authSig, 
                        resourceId 
                    })
                    console.log(">> JWT:", jwt);
                }catch(e){
                    console.error("Failed to fetch JWT");
                    setError(`You are not authorised to access to this content, you must "${_humanised}"`);
                    window.alert = tempAlert;
                    return;
                }


                const data = (await (await fetch(publicRuntimeConfig.BACKEND_API + '/notion/' + id, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ jwt })
                })).json());
                
                console.log("Fetched: ", data);
                
                if( data.error ){
                    console.error("Failed to fetch notion page id:", id);
                    setError("Notion page doesn't exist")
                    return;
                }
    
                setPage(data.recordMap)
                window.alert = tempAlert;
            }, 500)


        }
        run();
    }, [id])

    return (
        <>
            {
                error ? error
                : (!id || page == null) ? 'Loading...' 
                    : 
                    <>
                        <NotionRenderer recordMap={page} fullPage={true} darkMode={false} />
                    </>
                
            }
        </>
    );
}

export default notionPage;