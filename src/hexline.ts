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
    private _computedChk: number;

    constructor(hexString: string, offset?: number) {
        // Initialize variables
        this._correctHdr = false;
        this._computedChk = 0;

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
            if(hexString.length >= (HEADERLENGTH + 2*this.nbData)) {
                for(let i = 0; i < this.nbData; i++) {
                    this.data.push(this.parseAndUpdateChk(hexString, 4+i));
                }
            }
        }

        // Get the checksum
        if(this._correctHdr && (hexString.length >= (HEADERLENGTH + 2*this.nbData + 2))) {
            this.checksum = parseInt(hexString.substr(HEADERLENGTH + 2*this.nbData, 2), 16);
        }
    }

    private parseAndUpdateChk(hexString: string, byteId: number) {
        let res = parseInt(hexString.substr(1 + 2*byteId, 2), 16);
        this._computedChk += res;
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
}