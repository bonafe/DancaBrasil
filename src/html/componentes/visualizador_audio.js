//Referências:
//  https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/


export class VisualizadorAudio {



  constructor() {

    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    this.audioContext = new AudioContext();        

    fetch("musica.mp3")
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        

        this.audioBuffer = audioBuffer;
        
        
        this.criarLinhaTempo();        
      });
  }



  renderizar(milissegundoInicial, milissegundoFinal){
    const dadosFiltrados = this.filtrarDados(this.audioBuffer, milissegundoInicial, milissegundoFinal);
    const dadosNormalizados = this.normalizarDados(dadosFiltrados);
    this.desenhar(dadosNormalizados);
    this.atualizarBackground(); 
  }



  atualizarBackground(){
    const canvas = document.querySelector("canvas");
    const data = canvas.toDataURL();
    const fundoLinhaTempo = document.querySelector('.vis-timeline');
    fundoLinhaTempo.style.backgroundImage = 'url('+data+')';
  }



  criarLinhaTempo(){

    var container = document.getElementById('linhaTempo');

    // note that months are zero-based in the JavaScript Date object
    var items = new vis.DataSet([
      /*
        {start: new Date(2010,7,23), content: '<div>Conversation</div><img src="../resources/img/community-users-icon.png" style="width:32px; height:32px;">'},
        {start: new Date(2010,7,23,23,0,0), content: '<div>Mail from boss</div><img src="../resources/img/mail-icon.png" style="width:32px; height:32px;">'},
        {start: new Date(2010,7,24,16,0,0), content: 'Report'},
        {start: new Date(2010,7,26), end: new Date(2010,8,2), content: 'Traject A'},
        {start: new Date(2010,7,28), content: '<div>Memo</div><img src="../resources/img/notes-edit-icon.png" style="width:48px; height:48px;">'},
        {start: new Date(2010,7,29), content: '<div>Phone call</div><img src="../resources/img/Hardware-Mobile-Phone-icon.png" style="width:32px; height:32px;">'},
        {start: new Date(2010,7,31), end: new Date(2010,8,3), content: 'Traject B'},
        {start: new Date(2010,8,4,12,0,0), content: '<div>Report</div><img src="../resources/img/attachment-icon.png" style="width:32px; height:32px;">'}
        */
    ]);

    const inicioTempo = new Date();
    inicioTempo.setHours(0);
    inicioTempo.setMinutes(0);
    inicioTempo.setSeconds(0);
    inicioTempo.setMilliseconds(0);

    const fimTempo = new Date(inicioTempo);
    fimTempo.setSeconds(inicioTempo.getSeconds() + this.tamanhoSegundos());

    var options = {
        editable: true,
        margin: {
            item: 20,
            axis: 40
        },
        start: inicioTempo,
        end: fimTempo,
        zoomMax: 1000000,
        zoomMin: 1,
        min: inicioTempo,
        max: fimTempo,
        format:{
            minorLabels: {
                millisecond:'SSS',
                second:     'HH:mm:ss',
                minute:     'HH:mm',
                hour:       'HH:mm'                    
            },

            majorLabels: {
                millisecond:'HH:mm:ss',
                second:     '',
                minute:     '',
                hour:       ''
            }
        }
    };

    this.linhaTempo = new vis.Timeline(container, items, options);
    this.linhaTempo.on ('rangechange', (eventoRangeChange) => {
      
      const inicio = eventoRangeChange.start;
      
      const fim = eventoRangeChange.end;

      const milissegundoInicial = 
        (inicio.getHours()  * 60 * 60 * 1_000) +
        (inicio.getMinutes()* 60 * 1_000) +
        (inicio.getSeconds()* 1_000) +
        (inicio.getMilliseconds());

      const milissegundoFinal = 
        (fim.getHours()  * 60 * 60 * 1_000) +
        (fim.getMinutes()* 60 * 1_000) +
        (fim.getSeconds()* 1_000) +
        (fim.getMilliseconds());

      this.renderizar(milissegundoInicial, milissegundoFinal);
    });
  }



  tamanhoSegundos(){
    return this.audioBuffer.duration;
  }



  normalizarDados(audioBuffer){
    const multiplicador = Math.pow(Math.max(...audioBuffer), -1);
    return audioBuffer.map(valor => valor * multiplicador);
  }
  


  filtrarDados (audioBuffer, milissegundoInicial, milissegundoFinal){

    
    const sampleRateMilissegundo = audioBuffer.sampleRate / 1000


    const inicioRegistrosJanela = milissegundoInicial * sampleRateMilissegundo;

    const fimRegistrosJanela = milissegundoFinal * sampleRateMilissegundo;


    //Define o canal 0 como canal para buscarmos os dados
    const dadosBrutos = audioBuffer.getChannelData(0);

    //Iremos trabalhar apenas com os dados selecionados na Linha do Tempo
    const janelaDados = dadosBrutos.slice(inicioRegistrosJanela, fimRegistrosJanela);


    //Número de amostras que serão exibidas em nossa visualização
    const amostras = 500;

    //O tamanho do bloco será o tamanho total dos dados brutos dividido pelo número que amostras que desejamos
    const tamanhoBloco = Math.floor(janelaDados.length / amostras);


    const dadosFiltrados = [];

    for (let blocoAtual = 0; blocoAtual < amostras; blocoAtual++) {

      const inicioRegistrosBloco = blocoAtual * tamanhoBloco;
      const fimRegistrosBloco = inicioRegistrosBloco + tamanhoBloco;

      const amostra = janelaDados.slice(inicioRegistrosBloco, fimRegistrosBloco);

      const somaValores = amostra.reduce(
          (valorAnterior, valorAtual) => (valorAnterior + Math.abs(valorAtual)), 
          0
        );

      const mediaValores = somaValores / amostra.length;

      dadosFiltrados.push(mediaValores); 
    }

    return dadosFiltrados;
  }



  desenhar(audioBuffer){
    
    const fundoLinhaTempo = document.querySelector('.vis-timeline');

    const canvas = document.querySelector("canvas");

    const dpr = window.devicePixelRatio || 1;

    const padding = 20;

    canvas.width = fundoLinhaTempo.clientWidth * dpr; //canvas.offsetWidth * dpr;

    canvas.height = (fundoLinhaTempo.offsetHeight + padding * 2) * dpr; //(canvas.offsetHeight + padding * 2) * dpr;

    const ctx = canvas.getContext("2d");

    ctx.scale(dpr, dpr);

    ctx.translate(0, canvas.offsetHeight / 2 + padding);
    
    const width = canvas.offsetWidth / audioBuffer.length;

    for (let i = 0; i < audioBuffer.length; i++) {

      const x = width * i;

      let height = audioBuffer[i] * (canvas.offsetHeight/2) - padding;

      /*
      if (height < 0) {

          height = 0;

      } else if (height > canvas.offsetHeight / 2) {

          height = height > canvas.offsetHeight / 2;
      }
      */

      this.desenharSegmentoLinha(ctx, x, height, width, (i + 1) % 2);
    }
  }



  desenharSegmentoLinha (ctx, x, y, width, isEven){

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#33fd";
    ctx.beginPath();
    y = isEven ? y : -y;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven);
    ctx.lineTo(x + width, 0);
    ctx.stroke();
  }
}


