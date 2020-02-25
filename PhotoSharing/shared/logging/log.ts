import * as colors from 'colors';
let colors2 = require('colors');

export default function Log(tag: string, ...content: any[]) {
    console.log(tag.blue.bold + ':', ...content);
}
