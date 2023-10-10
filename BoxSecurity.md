

# Box Security

This document briefly describes the security protocol used to control the box. 


### 1. We make the box, and add it to the database 
    mac_address = "00:11:22:33:44:55"
    key = key = "cQfTjWnZr4u7x!z%" //random key saved in box and on server, 128-bit key
    addBoxToDatabase(mac_address, key)



### 2. User connects to the box via the app (bluetooth)

### 3. The box creates a challenge using random numbers 

   challenge= "455BB1E93B01E6B2"
   there are 2^64 possible challenges

### 4. App reads the challenge from the box and sends it to server

    
   GET /???/box_id/challenge

### 5. Server encrypts the challenge with the key of the box and sends the solution back to the app
```ts
    import CryptoES from 'crypto-es';

    //check if box_id exists in database
    //check if the user is allowed to control the box
    //check that the challenge is the length it should be (16 hex characters)!
    key = getKeyForBoxID(box_id)

    const key128Bits = CryptoES.enc.Utf8.parse(key);
    const encrypted = CryptoES.AES.encrypt(challenge, key128Bits, { mode: CryptoES.mode.ECB, padding: CryptoES.pad.NoPadding });

    //to hex
    let encryptedHex = encrypted.ciphertext.toString(CryptoES.enc.Hex);
    //to uppercase
    let response = encryptedHex.toUpperCase();
    //F4FBA58B6A7430C9005CFBF6DDB63EC8
    //has to be 32 hex characters long for security reasons (ECB mode)

```

### 6. Device sends the response to the box

    //security F4FBA58B6A7430C9005CFBF6DDB63EC8 32 hex characters = 16bytes = 128bits = 2^128 if one were to brute

### 7. Box checks the response

   it does the same encryption and compares the result

   if the result is the same, the device is allowed to control the box

   else the box disconnects the connection 

### 8. The device can now control the box

## Possible attacks:

Replay attack is not possible because the challenge is random. 

A normal user who is allowed to control the box temporely can remember the challenge and response. and use it to control the box next time he is presented with the same challenge but not granted acces by the server. But the challenge is random. so the user would have to remember 2^64 challenges. 

ECB mode is used because it is faster than CBC mode. And the box has a hardware AES encryption chip. making it faster than software encryption. ECB is only safe when encrypting 16 bytes at a time (block size).
The box can only encrypt 16 bytes at a time. so the challenge has to be 16 bytes long.

An attacker can try to brute force the solution to the challenge withouth knowing the key. but the attacker would have to try 2^128 solutions. Each try would take ~15 seconds. And the box would disable the the connections after 3 failed attempts. So the attacker would have to wait X minutes before trying again.

Extracting the private key from the box. If an attacker has physical access to the box, he can by using a hardware debugger and some tricks to extract the key from the box. That would give him full control of the box. But he would have to do that for every box he wants to control. 

Brute forcing the key. If normal user who has acces to the box can remember the challenge and response. he can try to brute force the key. But the key is 128-bit long. 

Database leak. If an attacker gets access to the database, he can get the key for every box. Major security breach!



