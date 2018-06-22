import * as vscode from 'vscode';

// Hex file types
var TYPES = {
    DATA: 0x00,
    EOF: 0x01,
    EXTSEGADDRESS: 0x02,
    STARTSEGADDRESS: 0x03,
    EXTLINADDRESS: 0x04,
    STARTLINADDRESS: 0x05
}

// Header length = ':' + data length (2) + address (4) + type (2)
var HEADERLENGTH = 9

export class HexLine {
    startCode: string;
    nbData: number;
    address: number;
    hexType: number;
    data: number[];
    checksum: number;

    private _correctHdr : boolean;
    private _addOffset: number;
    private _byteSum: number;

    constructor(hexString: string, offset?: number) {
        // Initialize variables
        this._correctHdr = false;
        this._byteSum = 0;

        if(offset) {
            this._addOffset = offset;
        } else {
            this._addOffset = 0;
        }

        this.checksum = NaN;

        // Check if the header is correct
        if(hexString.length > HEADERLENGTH) {
            this.startCode = hexString.charAt(0);
            this.nbData = this.parseAndUpdateChk(hexString, 0);
            this.address = 256 * this.parseAndUpdateChk(hexString, 1);
            this.address += this.parseAndUpdateChk(hexString, 2);
            this.hexType = this.parseAndUpdateChk(hexString, 3);

            this._correctHdr = (this.startCode === ':' &&
                this.nbData != NaN &&
                this.address != NaN &&
                this.hexType != NaN &&
                TYPES.DATA <= this.hexType && this.hexType <= TYPES.STARTLINADDRESS);
        }

        // Get the data
        this.data = [];
        if (this._correctHdr) {
            // Check how many bytes are present (data + chk)
            let nbBytes = Math.trunc((hexString.length - HEADERLENGTH) / 2);
            let nb = Math.min(nbBytes, this.nbData);

            // Try to get he right number of bytes
            for(let i = 0; i < nb; i++) {
                this.data.push(this.parseAndUpdateChk(hexString, 4+i));
            }
        }

        // Get the checksum if possible
        if(this._correctHdr && (hexString.length >= (HEADERLENGTH + 2*this.nbData + 2))) {
            this.checksum = parseInt(hexString.substr(HEADERLENGTH + 2*this.nbData, 2), 16);
        }
    }

    private parseAndUpdateChk(hexString: string, byteId: number) {
        let res = parseInt(hexString.substr(1 + 2*byteId, 2), 16);
        this._byteSum += res;
        return res;
    }

    public isData(): boolean {
        return this._correctHdr && this.hexType === TYPES.DATA;
    }

    public isExtendedAddress(): boolean {
        return this._correctHdr && (this.hexType === TYPES.EXTSEGADDRESS || this.hexType === TYPES.EXTLINADDRESS);
    }

    public isStartAddress(): boolean {
        return this._correctHdr && (this.hexType === TYPES.STARTSEGADDRESS || this.hexType === TYPES.STARTLINADDRESS);
    }

    public isEOF(): boolean {
        return this._correctHdr && this.hexType === TYPES.EOF;
    }

    public size(): number {
        if(this.isData()) {
            return this.nbData;
        }

        return 0;
    }

    public charToAddress(character: number): number {
        if(this.isData()) {
            let relative = (character - HEADERLENGTH) / 2;
            if(relative >= 0)
            {
                relative = Math.trunc(relative)
                if (relative < this.nbData) {
                    return relative + this.address + this._addOffset;
                }
            }
        }

        return -1;
    }

    public extAddress(): number {
        if (this.data.length < 2) {
            return -1;
        }

        switch(this.hexType) {
            case TYPES.EXTSEGADDRESS:
                return (this.data[0] * 256 + this.data[1]) * 16;
            case TYPES.EXTLINADDRESS:
                return (this.data[0] * 256 + this.data[1]) * 65536;
        }

        return -1;
    }

    public addressToChar(address: number) : number {
        if(this.isData()) {
            let lowRange = this.address + this._addOffset;
            let highRange = lowRange + this.nbData -1;

            if(lowRange <= address && address <= highRange) {
                return ((address - lowRange) * 2) + HEADERLENGTH;
            }
        }
        return -1;
    }

    private computedChk() : number {
        return (255 - (this._byteSum % 256) + 1) % 256;
    }

    public isBroken() : boolean {
        if (this._correctHdr && (this.nbData == this.data.length))
        {
            return this.computedChk() != this.checksum;
        }
        return true
    }

    public repair() : boolean {
        // We can only repair lines that have at least a correct header
        if(this._correctHdr)
        {
            // First check that there is enough data
            if(this.data.length < this.nbData) {
                // Not enough, add zeroes
                let toAdd = (this.nbData - this.data.length);
                for(let i = 0; i < toAdd; i++)
                {
                    this.data.push(0);
                }
            } else if(this.data.length > this.nbData) {
                // Too much data, cut it
                this.data = this.data.slice(0, this.nbData-1);
            }

            // Compute checksum
            this.checksum = this.computedChk();

            return true;
        }

        return false;
    }

    private appendByte(str: string, byte: number) : string {
        return str.concat(("00" + byte.toString(16)).substr(-2));
    }

    public toString() : string {
        let res = ':';

        // Add header
        res = this.appendByte(res, this.nbData);
        res = this.appendByte(res, Math.trunc(this.address / 256));
        res = this.appendByte(res, (this.address % 256));
        res = this.appendByte(res, this.hexType);

        // Add Data
        for(let i = 0; i < this.data.length; i++) {
            res = this.appendByte(res, this.data[i]);
        }

        // Add checksum
        res = this.appendByte(res, this.checksum);

        return res.toUpperCase();
    }
}