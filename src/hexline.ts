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

    correctHdr : boolean;
    addOffset: number;
    computedChk: number;

    constructor(hexString: string) {
        // Initialize variables
        this.correctHdr = false;
        this.computedChk = 0;
        this.addOffset = 0;

        // Check if the header is correct
        if(hexString.length > HEADERLENGTH) {
            this.startCode = hexString.charAt(0);
            this.nbData = this.parseAndUpdateChk(hexString, 0);
            this.address = 256 * this.parseAndUpdateChk(hexString, 1);
            this.address += this.parseAndUpdateChk(hexString, 2);
            this.hexType = this.parseAndUpdateChk(hexString, 3);

            this.correctHdr = (this.startCode === ':' &&
                this.nbData != NaN &&
                this.address != NaN &&
                this.hexType != NaN &&
                TYPES.DATA <= this.hexType && this.hexType <= TYPES.STARTLINADDRESS);
        }
    }

    private parseAndUpdateChk(hexString: string, byteId: number) {
        let res = parseInt(hexString.substr(1 + 2*byteId, 2), 16);
        this.computedChk += res;
        return res;
    }

    public isData(): boolean {
        return this.correctHdr && this.hexType === TYPES.DATA;
    }

    public isExtendedAddress(): boolean {
        return this.correctHdr && (this.hexType === TYPES.EXTSEGADDRESS || this.hexType === TYPES.EXTLINADDRESS);
    }

    public isStartAddress(): boolean {
        return this.correctHdr && (this.hexType === TYPES.STARTSEGADDRESS || this.hexType === TYPES.STARTLINADDRESS);
    }

    public isEOF(): boolean {
        return this.correctHdr && this.hexType === TYPES.EOF;
    }

    public size(): number {
        if(this.isData()) {
            return this.nbData;
        }

        return 0;
    }
}