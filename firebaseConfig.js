
import { initializeApp, getApp, getApps } from "firebase/app";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    listAll,
} from "firebase/storage";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAub1kscbCLLl-_lNirQvEEs50rkoaCYpU",
    authDomain: "dlmd-392218.firebaseapp.com",
    projectId: "dlmd-392218",
    storageBucket: "dlmd-392218.appspot.com",
    messagingSenderId: "768327334147",
    appId: "1:768327334147:web:f88b368a0f577c299bd136",
    measurementId: "G-HBFJXY1KLR"
};


console.log(firebaseConfig);

if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}
const fbApp = getApp();
const fbStorage = getStorage();

const listFiles = async () => {
    const storage = getStorage();

    // Create a reference under which you want to list
    const listRef = ref(storage, "images");

    // Find all the prefixes and items.
    const listResp = await listAll(listRef);
    return listResp.items;
};

/**
 *
 * @param {*} uri
 * @param {*} name
 */
const uploadToFirebase = async (uri, name, onProgress) => {
    const fetchResponse = await fetch(uri);
    const theBlob = await fetchResponse.blob();

    const imageRef = ref(getStorage(), `images/${name}`);

    const uploadTask = uploadBytesResumable(imageRef, theBlob);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress =
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress && onProgress(progress);
            },
            (error) => {
                // Handle unsuccessful uploads
                console.log(error);
                reject(error);
            },
            async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                    downloadUrl,
                    metadata: uploadTask.snapshot.metadata,
                });
            }
        );
    });
};

export { fbApp, fbStorage, uploadToFirebase, listFiles };